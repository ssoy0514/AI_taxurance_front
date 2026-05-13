module.exports = {
  apps: [
    {
      name: 'fcai-prd-ext',
      cwd: __dirname,
      script: 'npm',
      args: 'run start_ext',
      instances: 1,
      exec_mode: 'fork',
      kill_timeout: 5000,
      out_file: process.env.PM2_LOG_DIR
        ? `${process.env.PM2_LOG_DIR}/prd-ext-out.log`
        : 'prd-ext-out.log',
      error_file: process.env.PM2_LOG_DIR
        ? `${process.env.PM2_LOG_DIR}/prd-ext-err.log`
        : 'prd-ext-err.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
    },
  ],
}
