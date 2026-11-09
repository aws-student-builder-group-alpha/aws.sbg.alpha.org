import { applicationRuntime } from "./application-runtime.mjs";
import { createExportRoute, createIntakeRoute, createDecisionRoute, createEvaluationRoute } from "./staff-http-runtime.mjs";
import { validSubmission } from "./submission.mjs";

/** Real server/HTTP/SQL, isolated data and a substituted verified-session boundary. */
export async function evaluationRuntime(origin="https://evaluations.example.test") {
  const base=await applicationRuntime(origin);await base.open();
  let aal="aal2", availability="auto";
  const admin=await base.addIdentity(), first=await base.addIdentity(), second=await base.addIdentity();
  for(const [person,role] of [[admin,"administrator"],[first,"evaluator"],[second,"evaluator"]])await base.db.query("insert into staff_memberships(user_id,role,status) values($1,$2,'active')",[person.id,role]);
  async function rpc(name,args={}){
    const decisionCalls={decision_state:["select public.decision_state($1) value",[args.p_application_id]],decision_history_page:["select public.decision_history_page($1,$2) value",[args.p_application_id,args.p_offset??0]],manage_decision:["select public.manage_decision($1) value",[args.p_request]]};
    const calls={evaluation_list:["select public.evaluation_list($1,$2) value",[args.p_offset??0,args.p_search??""]],evaluation_detail:["select public.evaluation_detail($1) value",[args.p_application_id]],evaluation_history:["select public.evaluation_history($1,$2) value",[args.p_application_id,args.p_offset??0]],manage_evaluation:["select public.manage_evaluation($1) value",[args.p_request]]};
    Object.assign(calls,decisionCalls,{intake_state:["select public.intake_state() value",[]],intake_history_page:["select public.intake_history_page($1) value",[args.p_offset===undefined?0:args.p_offset]],manage_intake:["select public.manage_intake($1) value",[args.p_request]]});
    calls.admin_application_queue=["select public.admin_application_queue($1,$2) value",[args.p_offset??0,args.p_filters===undefined?{}:args.p_filters]];
    calls.admin_application_export=["select public.admin_application_export($1) value",[args.p_filters===undefined?{}:args.p_filters]];
    if(!calls[name])return base.rpc(name,args);
    return base.db.transaction(async tx=>{await tx.exec("set local role authenticated");await tx.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)",[base.identity.id,JSON.stringify({sub:base.identity.id,aal})]);return (await tx.query(...calls[name])).rows[0].value;});
  }
  async function session(){
    if(availability!=="auto")return {kind:availability};
    const membership=(await base.db.query("select role,status,version from staff_memberships where user_id=$1",[base.identity.id])).rows[0];
    const client={rpc:(name,args)=>{const request=(async()=>{try{return {data:await rpc(name,args),error:null};}catch(e){return {data:null,error:{code:e.code,details:e.detail}};}})();request.abortSignal=()=>request;return request;}};
    return membership?{kind:"staff",identity:base.identity,membership,needsMfa:membership.role==="administrator"&&aal!=="aal2",client}:{kind:"applicant",identity:base.identity,client};
  }
  const exportHandlers=await createExportRoute(session,origin);
  const handlers=await createEvaluationRoute(session,origin);
  const intakeHandlers=await createIntakeRoute(session,origin);
  const decisionHandlers=await createDecisionRoute(session,origin);
  async function createApplication(){const previous=base.identity;const owner=await base.addIdentity();base.setIdentity(owner);await base.rpc("save_applicant_draft",{p_data:validSubmission(),p_expected_version:0,p_mutation_id:crypto.randomUUID()});const app=await base.rpc("submit_applicant_application",{p_expected_version:1,p_mutation_id:crypto.randomUUID()});base.setIdentity(previous);return {owner,app};}
  base.setIdentity(admin);
  return {db:base.db,admin,first,second,handlers,decisionHandlers,intakeHandlers,exportHandlers,applicationHandlers:base.handlers,rpc,createApplication,addIdentity:base.addIdentity,get identity(){return base.identity;},as(person,level="aal2"){base.setIdentity(person);aal=level;availability="auto";},setAvailability(value){availability=value;},
    async access(){const s=await session();return s.kind==="staff"?{kind:"staff",accountId:base.identity.id,role:s.membership.role,status:s.membership.status,needsMfa:s.needsMfa}:s.kind==="applicant"?{kind:"applicant",accountId:base.identity.id}:{kind:s.kind};},
    post(request,options={}){return handlers.POST(new Request(origin+"/api/evaluations",{method:"POST",headers:{origin,"Content-Type":"application/json",...options.headers},body:typeof request==="string"?request:JSON.stringify({accountId:base.identity.id,request})}));},
    postDecision(request,options={}){return decisionHandlers.POST(new Request(origin+"/api/decisions",{method:"POST",headers:{origin,"Content-Type":"application/json",...options.headers},body:typeof request==="string"?request:JSON.stringify({accountId:base.identity.id,request})}));},
    getDecision(applicationId,values={}){return decisionHandlers.GET(new Request(origin+"/api/decisions?"+new URLSearchParams({accountId:base.identity.id,applicationId,...values})));},
    get(values={}){return handlers.GET(new Request(origin+"/api/evaluations?"+new URLSearchParams({accountId:base.identity.id,...values})));}};
}
