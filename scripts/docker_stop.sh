#!/bin/bash
echo "Stopping WeStudy containers..."
docker stop we-study-mongodb 2>/dev/null
docker stop we-study-redis 2>/dev/null
echo "Containers stopped."
