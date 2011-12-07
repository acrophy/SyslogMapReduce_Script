#!/bin/bash
# This is a program to test the performance of MongoDB cluster.
# Last edit: 2011-10-25
date >> /tmp/MongoDBTest/HP/CPU.log;
mpstat | tail -2 | head -1 >> /tmp/MongoDBTest/HP/CPU.log;
echo "mpstat 1 1" | ssh root@172.17.1.251 | tail -2 | head -1 >> /tmp/MongoDBTest/HP/CPU.log;
echo "mpstat 1 1" | ssh root@172.17.1.252 | tail -2 | head -1 >> /tmp/MongoDBTest/HP/CPU.log;
echo "mpstat 1 1" | ssh root@172.17.1.253 | tail -2 | head -1 >> /tmp/MongoDBTest/HP/CPU.log;
echo "mpstat 1 1" | ssh root@172.17.1.254 | tail -2 | head -1 >> /tmp/MongoDBTest/HP/CPU.log;

date >> /tmp/MongoDBTest/HP/memory.log
free | head -1 >> /tmp/MongoDBTest/HP/memory.log;
echo "free" | ssh root@172.17.1.251 | head -2 | tail -1 >> /tmp/MongoDBTest/HP/memory.log;
echo "free" | ssh root@172.17.1.252 | head -2 | tail -1 >> /tmp/MongoDBTest/HP/memory.log;
echo "free" | ssh root@172.17.1.253 | head -2 | tail -1 >> /tmp/MongoDBTest/HP/memory.log;
echo "free" | ssh root@172.17.1.254 | head -2 | tail -1 >> /tmp/MongoDBTest/HP/memory.log;

date >> /tmp/MongoDBTest/HP/IO.log
iostat -mx | tail -3 | head -1 >> /tmp/MongoDBTest/HP/IO.log;
echo "iostat -mx" | ssh root@172.17.1.251 | tail -2 | head -1 >> /tmp/MongoDBTest/HP/IO.log;
echo "iostat -mx" | ssh root@172.17.1.252 | tail -2 | head -1 >> /tmp/MongoDBTest/HP/IO.log;
echo "iostat -mx" | ssh root@172.17.1.253 | tail -2 | head -1 >> /tmp/MongoDBTest/HP/IO.log;
echo "iostat -mx" | ssh root@172.17.1.254 | tail -2 | head -1 >> /tmp/MongoDBTest/HP/IO.log;

date >> /tmp/MongoDBTest/HP/traffic.log
more /proc/net/dev | head -2 >> /tmp/MongoDBTest/HP/traffic.log
echo "more /proc/net/dev" | ssh root@172.17.1.251 | tail -1 >> /tmp/MongoDBTest/HP/traffic.log;
echo "more /proc/net/dev" | ssh root@172.17.1.252 | tail -1 >> /tmp/MongoDBTest/HP/traffic.log;
echo "more /proc/net/dev" | ssh root@172.17.1.253 | tail -1 >> /tmp/MongoDBTest/HP/traffic.log;
echo "more /proc/net/dev" | ssh root@172.17.1.254 | tail -1 >> /tmp/MongoDBTest/HP/traffic.log;

mongo localhost:37001/dbpanabit /root/CollStats.js | tail -1 >> /tmp/MongoDBTest/CollStats.log;
