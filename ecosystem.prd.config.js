module.exports = {
  apps: [
    {
      name: 'fcai-prd',
      cwd: __dirname,
      script: 'npm',
      args: 'run start',
      instances: 1,
      exec_mode: 'fork',
      kill_timeout: 5000,
      out_file: process.env.PM2_LOG_DIR
        ? `${process.env.PM2_LOG_DIR}/prd-out.log`
        : 'prd-out.log',
      error_file: process.env.PM2_LOG_DIR
        ? `${process.env.PM2_LOG_DIR}/prd-err.log`
        : 'prd-err.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
    },
  ],
}
