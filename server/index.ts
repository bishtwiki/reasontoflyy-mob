import { createApp } from './app';
import { config } from './config';
const {app,store}=createApp();
const server=app.listen(config.port,'0.0.0.0',()=>console.log(`Travel API listening on port ${config.port} (${config.environment}).`));
function shutdown(){server.close(()=>{store.close();process.exit(0);});}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
