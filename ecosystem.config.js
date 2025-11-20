module.exports = {
  apps: [
    {
      name: "api",
      script: "dist/index.js",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "development",
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },

      node_args: "--max-old-space-size=1024",
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      log_file: "./logs/combined.log",
      time: true,

      autorestart: true,
      watch: false,
      max_memory_restart: "1G",

      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
  ],
};
