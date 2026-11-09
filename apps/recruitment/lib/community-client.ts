import { fetchJson } from './http-request.ts';
import { record } from './drafts.ts';
export class CommunityClientError extends Error{status:number;constructor(message:string,status:number){super(message);this.status=status}}
export async function communityRead(accountId:string,action:string,params:Record<string,string>={},signal?:AbortSignal){
 const query=new URLSearchParams({accountId,action,...params});
 return communityFetch('/api/community?'+query,{signal});
}
export async function communityFetch(url:string,init:RequestInit={}){
 let result:Awaited<ReturnType<typeof fetchJson>>;
 try{result=await fetchJson(url,init,20000)}catch{throw new CommunityClientError('This action could not be confirmed. Check your connection and retry.',503)}
 const {response,data}=result;
 if(!response.ok||!record(data)||data.ok!==true)throw new CommunityClientError(record(data)&&typeof data.message==='string'?data.message:'This action could not be confirmed. Retry shortly.',response.status);
 return data.data;
}
export function communityCommand(accountId:string,action:string,body:Record<string,unknown>){
 return communityFetch('/api/community',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accountId,action,...body})});
}
