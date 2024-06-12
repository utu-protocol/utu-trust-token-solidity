#!/bin/bash

# Login and API credentials file is expected in the same dir as conf files
printf "${CHAINLINK_API_USER}\n${CHAINLINK_API_PASSWORD}\n" > .api

# Create the /chainlink/config directory if it doesn't exist
mkdir -p /chainlink/config

# Create the /chainlink/jobs directory if it doesn't exist
mkdir -p /chainlink/jobs

# Change ownership of the /chainlink directory to the chainlink user
chown -R chainlink.chainlink /chainlink

# Substitute environment variables in the config file template
envsubst < /etc/chainlink/config/chainlink-config.toml.template > /chainlink/config/runtime-config.toml

# Process job definition templates and save them to /chainlink/jobs
for job_template in /etc/chainlink/jobs/*.toml.template; do
  job_file="/chainlink/jobs/$(basename "${job_template%.template}")"
  envsubst < "$job_template" > "$job_file"
done

export CL_DATABASE_URL=${POSTGRES_HOST}://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}

# Switch to the chainlink user while preserving the environment
su -p chainlink -c "chainlink --config /chainlink/config/runtime-config.toml node start --api .api &"

# Wait for the Chainlink node to be available
until curl -s -o /dev/null -w "%{http_code}" http://localhost:6688/health | grep -qE "^2"; do
  echo "Waiting for the Chainlink node to be available..."
  sleep 1
done

# Log in to the Chainlink node using the CLI
chainlink admin login --file .api

# Function to get the job ID 
get_job_id() {
  local external_job_id="$1"
  local output=$(chainlink jobs show "$external_job_id" 2>/dev/null)
  if [[ $? -eq 0 ]]; then
    echo "$output" | awk 'NR == 5 {print $2}'
  else
    echo ""
  fi
}

# Create or re-create jobs from the generated job files
echo "Creating or re-creating jobs..."
for job_file in /chainlink/jobs/*.toml; do
  # Extract the externalJobID from the job specification file
  external_job_id=$(grep -oP 'externalJobID\s*=\s*"\K[^"]+' "$job_file")

  # Check if the externalJobID is found in the file
  if [[ -z "$external_job_id" ]]; then
    echo "Error: externalJobID not found in the job file $job_file"
    continue
  fi

  # Get the job ID using the 'get_job_id' function
  job_id=$(get_job_id "$external_job_id")

  # Check if the job exists
  if [[ -n "$job_id" ]]; then
    # Delete the existing job
    echo "Deleting job $job_id ($external_job_id)"
    chainlink jobs delete "$job_id"
  fi

  # Create a new job
  echo "Creating job $external_job_id"
  chainlink jobs create "$job_file"
done

# Keep the containter running 
# (alling `wait` doesn't work for some reason)
tail -f /dev/null