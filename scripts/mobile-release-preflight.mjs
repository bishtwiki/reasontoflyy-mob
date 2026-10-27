const profile=process.env.EAS_BUILD_PROFILE||'';
if(!['preview','production'].includes(profile))process.exit(0);

const value=process.env.EXPO_PUBLIC_API_URL;
if(!value){
 console.error('Set EXPO_PUBLIC_API_URL in the matching EAS environment before building. It must be the public HTTPS API base ending in /api.');
 process.exit(1);
}

let url;
try{url=new URL(value);}catch{
 console.error('EXPO_PUBLIC_API_URL must be a valid public HTTPS URL ending in /api.');
 process.exit(1);
}
const host=url.hostname.toLowerCase().replace(/^\[|\]$/g,'');
const ipv4=host.split('.').map(Number);
const privateIPv4=ipv4.length===4&&ipv4.every(n=>Number.isInteger(n)&&n>=0&&n<=255)&&(
 ipv4[0]===10||ipv4[0]===127||ipv4[0]===0||
 (ipv4[0]===192&&ipv4[1]===168)||
 (ipv4[0]===172&&ipv4[1]>=16&&ipv4[1]<=31)||
 (ipv4[0]===169&&ipv4[1]===254)
);
if(url.protocol!=='https:'||host==='localhost'||host.endsWith('.local')||host==='::1'||privateIPv4||!url.pathname.replace(/\/+$/,'').endsWith('/api')){
 console.error('Release builds require a publicly reachable HTTPS API URL ending in /api; local and private-network URLs cannot serve installed apps.');
 process.exit(1);
}
