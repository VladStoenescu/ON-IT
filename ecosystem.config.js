module.exports = {
    apps: [
        {
            name: 'on-it',
            script: 'server.js',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '256M',
            env_production: {
                NODE_ENV: 'production',
                PORT: 3000,
                // Store data outside the git checkout so that `git pull` never
                // overwrites user data.  Create this directory on the server before
                // starting the application:
                //   sudo mkdir -p /opt/on-it-data && sudo chown $(whoami) /opt/on-it-data
                DATA_DIR: '/opt/on-it-data',
            },
            error_file: 'logs/err.log',
            out_file: 'logs/out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
        },
    ],
};
