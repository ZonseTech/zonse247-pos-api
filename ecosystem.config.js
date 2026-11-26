module.exports = {
  apps: [
    {
      name: "api",
      script: "dist/main.js",
      instances: "max",
      exec_mode: "cluster",
      cwd: "/var/www/api-app/current",
      env: {
        NODE_ENV: "development",
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: parseInt(process.env.SERVER_PORT) || 3001,
      },
      node_args: "--max-old-space-size=1024",
      error_file: "/var/www/api-app/shared/logs/err.log",
      out_file: "/var/www/api-app/shared/logs/out.log",
      log_file: "/var/www/api-app/shared/logs/combined.log",
      time: true,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
  ],
};
