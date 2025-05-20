#!/bin/bash

# Find processes using port 3000
pids=$(lsof -t -i:3000)

# Kill any processes found
if [ -n "$pids" ]; then
  echo "Found processes using port 3000. Killing them..."
  kill -9 $pids
  echo "Processes killed."
else
  echo "No processes found using port 3000."
fi

# Start the development server
echo "Starting dev server on port 3000..."
npm run dev 