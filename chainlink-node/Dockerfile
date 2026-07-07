# Use the official Chainlink node image as the base
FROM --platform=linux/amd64 smartcontract/chainlink:2.12.0

USER root

# Install gettext for envsubst command (needed by entrypoint.sh)
# The base image has a broken PostgreSQL apt repository, so we allow unauthenticated access
# and suppress those errors while still succeeding in installing from available repositories
RUN apt-get update -o APT::Get::AllowUnauthenticated=true 2>&1 | grep -v postgresql || true && \
    apt-get install -y gettext && \
    rm -rf /var/lib/apt/lists/*

# Create a directory for configuration files
RUN mkdir -p /etc/chainlink/config

# Copy configuration file template
COPY config/chainlink-config.toml.template /etc/chainlink/config/

# Copy job spec templates and value files into the container
COPY jobs /etc/chainlink/jobs

# Copy the entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Run the Chainlink node with the configuration file
ENTRYPOINT ["/entrypoint.sh"]