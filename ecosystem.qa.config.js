module.exports = {
  apps: [
    {
      name: 'fcai-qa',
      cwd: __dirname,
      script: 'npm',
      args: 'run start_qa',
      instances: 1,
      exec_mode: 'fork',
      kill_timeout: 5000,
      out_file: process.env.PM2_LOG_DIR
        ? `${process.env.PM2_LOG_DIR}/qa-out.log`
        : 'qa-out.log',
      error_file: process.env.PM2_LOG_DIR
        ? `${process.env.PM2_LOG_DIR}/qa-err.log`
        : 'qa-err.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
    },
  ],
}
