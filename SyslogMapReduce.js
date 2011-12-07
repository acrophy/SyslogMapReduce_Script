DEBUG = 1;
/*Determine the time interval this aggregation calculates¡£*/
var now = new Date();
var now_UTC = (now.getTime() / 1000).toPrecision(10);
var time = Math.floor(now_UTC / 600) * 600 - 600;

print("Process time at some ten minutes: "+time);

/*Constants definition, to make the later calculation easier*/
IPGroups = [{srcgroup:"admin", dstgroup:"abroad"},{srcgroup:"admin", dstgroup:"cernet"},{srcgroup:"admin", dstgroup:"telecom"},{srcgroup:"admin", dstgroup:"unicom"},
            {srcgroup:"office", dstgroup:"abroad"},{srcgroup:"office", dstgroup:"cernet"},{srcgroup:"office", dstgroup:"telecom"},{srcgroup:"office", dstgroup:"unicom"},
            {srcgroup:"dorm", dstgroup:"abroad"},{srcgroup:"dorm", dstgroup:"cernet"},{srcgroup:"dorm", dstgroup:"telecom"},{srcgroup:"dorm", dstgroup:"unicom"},
            {srcgroup:"wireless", dstgroup:"abroad"},{srcgroup:"wireless", dstgroup:"cernet"},{srcgroup:"wireless", dstgroup:"telecom"},{srcgroup:"wireless", dstgroup:"unicom"}
           ];
SrcIPGroups = ["admin", "office", "dorm", "wireless"];
DstIPGroups = ["abroad", "cernet", "telecom", "unicom"];

/*Count the number of documents this aggregation will process.*/
//if (DEBUG) print("Counting number of documents at " + (new Date()).toLocaleTimeString());
//num = db.trafficSyslog.count({"starttime":{"$lte":time+600}, "endtime":{"$gt":time}});
//print("Number of documents processed: "+num);

var startTime = ((new Date()).getTime() / 1000).toPrecision(10);

if (DEBUG) print("First MapReduce at "+(new Date()).toLocaleTimeString());
/*First MapReduce based on the three keys of srcgroup, dstgroup and app.*/
map = function() {
	if (this.srcgroup <= 11)
		emit({srcgroup:this.srcgroup, dstgroup:this.dstgroup, app:this.app}, {traffic:{inbyte:this.avgin*600, outbyte:this.avgout*600, conn:1}});
	else
		emit({srcgroup:this.dstgroup, dstgroup:this.srcgroup, app:this.app}, {traffic:{inbyte:this.avgout*600, outbyte:this.avgin*600, conn:1}}); 
	};
reduce = function(key, vals) {
	var n = {inbyte:0, outbyte:0, conn:0};
	for (var i in vals) {
		n.inbyte += vals[i].traffic.inbyte;
		n.outbyte += vals[i].traffic.outbyte;
		n.conn += vals[i].traffic.conn;
	}
	return {"traffic":n};
};

/*filter condition*/
query = {"starttime":{"$lte":time+600}, "endtime":{"$gt":time}};
mr = db.runCommand({
	mapreduce:"trafficSyslog", map:map, reduce:reduce, query:query,
	out:{replace:"TrafficMatrix_Agg"}
});

if (DEBUG) printjson(mr);


if (DEBUG) print("Updates at "+(new Date()).toLocaleTimeString());
/*based on the number-to-string map table of IPGroups , append the corresponding string into the temporary collection:TrafficMatrix_Agg*/
db.TrafficMatrix_Agg.update({"_id.srcgroup":{"$lte":2}}, {"$set":{"srcgroup":"admin"}}, false, true);
db.TrafficMatrix_Agg.update({"_id.srcgroup":{"$lte":6, "$gt":2}}, {"$set":{"srcgroup":"office"}}, false, true);
db.TrafficMatrix_Agg.update({"_id.srcgroup":{"$lte":10, "$gt":6}}, {"$set":{"srcgroup":"dorm"}}, false, true);
db.TrafficMatrix_Agg.update({"_id.srcgroup":11}, {"$set":{"srcgroup":"wireless"}}, false, true);

db.TrafficMatrix_Agg.update({"_id.dstgroup":{"$lte":257, "$gt":11}}, {"$set":{"dstgroup":"cernet"}}, false, true);
db.TrafficMatrix_Agg.update({"_id.dstgroup":258}, {"$set":{"dstgroup":"unicom"}}, false, true);
db.TrafficMatrix_Agg.update({"_id.dstgroup":259}, {"$set":{"dstgroup":"telecom"}}, false, true);
db.TrafficMatrix_Agg.update({"_id.dstgroup":{"$gte":260}}, {"$set":{"dstgroup":"abroad"}}, false, true);

/*append the apps we concerned into the collection:TrafficMatrix_Agg*/
db.TrafficMatrix_Agg.update({"_id.app":{"$ne":"http", "$ne":"bt", "$ne":"pplive"}}, {"$set":{"app":"else"}}, false, true);
db.TrafficMatrix_Agg.update({"_id.app":"http"}, {"$set":{"app":"http"}}, false, true);
db.TrafficMatrix_Agg.update({"_id.app":"bt"}, {"$set":{"app":"bt"}}, false, true);
db.TrafficMatrix_Agg.update({"_id.app":"pplive"}, {"$set":{"app":"pplive"}}, false, true);

/*Sencond MapReduce based on the string format of srcgroup, dstgroup and app.*/
if (DEBUG) print("Second MapReduce at "+(new Date()).toLocaleTimeString());
map = function() {
	emit({srcgroup:this.srcgroup, dstgroup:this.dstgroup, app:this.app}, 
		{traffic:{app:this.app, inbyte:this.value.traffic.inbyte, outbyte:this.value.traffic.outbyte, 
								totalbyte:this.value.traffic.inbyte+this.value.traffic.outbyte, percentage:0, conn:this.value.traffic.conn, connpercentage:0}});
};

reduce = function(key, vals) {
	var n = {app:"-", inbyte:0, outbyte:0, totalbyte:0, percentage:0, conn:0, connpercentage:0};
	for (var i in vals) {
		n.app = vals[i].traffic.app;
		n.inbyte += vals[i].traffic.inbyte;
		n.outbyte += vals[i].traffic.outbyte;
		n.conn += vals[i].traffic.conn;
	}
	n.totalbyte = n.inbyte + n.outbyte;
return {"traffic":n}; 
};

query = {"_id.srcgroup":{"$lte":11}, "_id.dstgroup":{"$gt":11}};
db.runCommand({
	mapreduce:"TrafficMatrix_Agg", map:map, reduce:reduce, query:query,
	out:{replace:"TrafficMatrix_MoreAgg"}
});


/*Totalbytes and total connections between some IP group in campus and some IP group out of campus*/
if (DEBUG) print("Total Calculation at "+(new Date()).toLocaleTimeString());
var alltotalbyte = 0;
var totalconn = 0;
var cursor = db.TrafficMatrix_MoreAgg.find();
while (cursor.hasNext()) {
	alltotalbyte += cursor.next().value.traffic.totalbyte;
	totalconn += cursor.next().value.traffic.conn;
}
if (DEBUG) print("alltotalbyte is "+alltotalbyte+"\n"+"totalconn is "+totalconn);


if (DEBUG) print("Regular process at "+(new Date()).toLocaleTimeString());
for (var i in IPGroups){
	db.TrafficMatrix.insert({srcgroup:IPGroups[i].srcgroup, dstgroup:IPGroups[i].dstgroup, time:time, traffic:[]});
}

/*Make traffic of different apps into an array*/
cursor = db.TrafficMatrix.find({time:time});
while (cursor.hasNext()) {
	var temp = cursor.next();
	var cursor1 = db.TrafficMatrix_MoreAgg.find({"_id.srcgroup":temp.srcgroup, "_id.dstgroup":temp.dstgroup});
	var appAll = {app:"all", inbyte:0, outbyte:0, totalbyte:0, percentage:1, conn:0, connpercentage:1};
	while (cursor1.hasNext()) {
		var temp1 = cursor1.next();
		var trafficApp = {app:temp1._id.app, inbyte:temp1.value.traffic.inbyte, outbyte:temp1.value.traffic.outbyte, totalbyte:temp1.value.traffic.totalbyte, 
				 percentage:temp1.value.traffic.totalbyte/alltotalbyte, conn:temp1.value.traffic.conn, connpercentage:temp1.value.traffic.conn/totalconn};
		appAll.inbyte += temp1.value.traffic.inbyte;
		appAll.outbyte += temp1.value.traffic.outbyte;
		appAll.totalbyte += temp1.value.traffic.totalbyte;
		appAll.conn += temp1.value.traffic.conn;
		temp.traffic.push(trafficApp);
	}
	temp.traffic.push(appAll);
	db.TrafficMatrix.save(temp);
}

/*Form the document of traffic between some IP group in campus and the whole outside*/
if (DEBUG) print("Inner-to-Wan process at "+(new Date()).toLocaleTimeString());
for (var i in SrcIPGroups){
	var innerToWan = {srcgroup:SrcIPGroups[i], dstgroup:"wan", time:time};
	cursor = db.TrafficMatrix.find({srcgroup:SrcIPGroups[i], time:time});
	if (cursor.hasNext()) innerToWan.traffic = cursor.next().traffic;

	while (cursor.hasNext()) {
		var temp = cursor.next();
		for (var j = 0; j <= 4; j++){
			innerToWan.traffic[j].inbyte += temp.traffic[j].inbyte;
			innerToWan.traffic[j].outbyte += temp.traffic[j].outbyte;
			innerToWan.traffic[j].totalbyte += temp.traffic[j].totalbyte;
			innerToWan.traffic[j].conn += temp.traffic[j].conn;
		}
	}
	
	for (var i in innerToWan.traffic) {
		innerToWan.traffic[i].percentage = innerToWan.traffic[i].totalbyte / innerToWan.traffic[4].totalbyte;
		innerToWan.traffic[i].connpercentage = innerToWan.traffic[i].conn / innerToWan.traffic[4].conn;
	}
	
	db.TrafficMatrix.insert(innerToWan);
}

/*Form the document of traffic between the whole inside IP groups and some IP group outside the campus*/
if (DEBUG) print("Sjtu-to-Outer process at "+(new Date()).toLocaleTimeString());
for (var i in DstIPGroups){
	var sjtuToOuter = {srcgroup:"sjtu", dstgroup:DstIPGroups[i], time:time};
	cursor = db.TrafficMatrix.find({dstgroup:DstIPGroups[i], time:time});
	if (cursor.hasNext()) sjtuToOuter.traffic = cursor.next().traffic;

	while (cursor.hasNext()) {
		var temp = cursor.next();
		for (var j = 0; j <= 4; j++){
			sjtuToOuter.traffic[j].inbyte += temp.traffic[j].inbyte;
			sjtuToOuter.traffic[j].outbyte += temp.traffic[j].outbyte;
			sjtuToOuter.traffic[j].totalbyte += temp.traffic[j].totalbyte;
			sjtuToOuter.traffic[j].conn += temp.traffic[j].conn;
		}
	}
	
	for (var i in sjtuToOuter.traffic) {
		sjtuToOuter.traffic[i].percentage = sjtuToOuter.traffic[i].totalbyte / sjtuToOuter.traffic[4].totalbyte;
		sjtuToOuter.traffic[i].connpercentage = sjtuToOuter.traffic[i].conn / sjtuToOuter.traffic[4].conn;
	}
	
	db.TrafficMatrix.insert(sjtuToOuter);
}

/*Form the document of traffic between the whole inside campus and the whole outside campus*/
if (DEBUG) print("Sjtu-to-Wan process at "+(new Date()).toLocaleTimeString());
cursor = db.TrafficMatrix.find({srcgroup:"sjtu", time:time});
var innerToOuter = {srcgroup:"sjtu", dstgroup:"wan", time:time};
if (cursor.hasNext()) innerToOuter.traffic = cursor.next().traffic;

while (cursor.hasNext()) {
	var temp = cursor.next();
	for (var j = 0; j <= 4; j++){
		innerToOuter.traffic[j].inbyte += temp.traffic[j].inbyte;
		innerToOuter.traffic[j].outbyte += temp.traffic[j].outbyte;
		innerToOuter.traffic[j].totalbyte += temp.traffic[j].totalbyte;
		innerToOuter.traffic[j].conn += temp.traffic[j].conn;
	}
}

for (var i in innerToOuter.traffic) {
	innerToOuter.traffic[i].percentage = innerToOuter.traffic[i].totalbyte / innerToOuter.traffic[4].totalbyte;
	innerToOuter.traffic[i].connpercentage = innerToOuter.traffic[i].conn / innerToOuter.traffic[4].conn;
}

db.TrafficMatrix.insert(innerToOuter);


var endTime = ((new Date()).getTime() / 1000).toPrecision(10);
print("Time used: "+Math.floor(endTime - startTime)+"s");
print("\n");

/*drop the temporary collections*/
db.TrafficMatrix_MoreAgg.drop();
db.TrafficMatrix_Agg.drop();