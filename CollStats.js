var now = new Date();
var time = now.toLocaleTimeString();
var format_date = now.toLocaleDateString();
var query = db.runCommand({collStats:"trafficSyslog", scale:1024});
var num_of_coll = query.count;
var size = query.size;
var index_size = query.totalIndexSize;
print(format_date+"\t"+time+"\t"+num_of_coll+"\t"+size+"KB"+"\t"+index_size+"KB");
