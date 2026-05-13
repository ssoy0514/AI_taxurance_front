module.exports = {
  apps: [
    {
      name: 'fcai-dev',
      cwd: __dirname,
      script: 'npm',
      args: 'run dev',
      watch: false,
      kill_timeout: 5000,
      out_file: process.env.PM2_LOG_DIR
        ? `${process.env.PM2_LOG_DIR}/dev-out.log`
        : 'dev-out.log',
      error_file: process.env.PM2_LOG_DIR
        ? `${process.env.PM2_LOG_DIR}/dev-err.log`
        : 'dev-err.log',
      time: true,
    },
  ],
}
