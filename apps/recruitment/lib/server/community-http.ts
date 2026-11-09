import "server-only";
import { getAppOrigin } from "@/lib/supabase/config";
import { CommunityError } from "./community";
export const privateHeaders={"Cache-Control":"private, no-store","Vary":"Cookie","X-Content-Type-Options":"nosniff"};
export function sameOrigin(request: Request) {
  if(request.headers.get('origin')!==getAppOrigin())throw new CommunityError('Use this action from the Alpha website.',403);
}
export async function boundedBody(request: Request,max: number,timeoutMs=10000) {
  const reader=request.body?.getReader();if(!reader)throw new CommunityError('Empty request.');
  const parts:Uint8Array[]=[];let size=0;let timer:ReturnType<typeof setTimeout>|undefined;
  const stop=()=>{void reader.cancel().catch(()=>{})};
  const deadline=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{reject(new CommunityError('The upload request timed out. Retry with a stable connection.',408));stop()},timeoutMs)});
  try{while(true){const{done,value}=await Promise.race([reader.read(),deadline]);if(done)break;size+=value.length;if(size>max){stop();throw new CommunityError('The request is too large.',413)}parts.push(value)}}finally{clearTimeout(timer);reader.releaseLock()}
  const body=new Uint8Array(size);let offset=0;for(const part of parts){body.set(part,offset);offset+=part.length}return body;
}
export function communityResponse(data: unknown,status=200) {return Response.json({ok:true,data},{status,headers:privateHeaders})}
export function communityFailure(error: unknown) {return Response.json({ok:false,message:error instanceof CommunityError?error.message:'This action could not be confirmed. Retry shortly.'},{status:error instanceof CommunityError?error.status:503,headers:privateHeaders})}
