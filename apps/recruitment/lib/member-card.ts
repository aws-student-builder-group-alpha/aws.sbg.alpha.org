import type { Member } from './community.ts';
import { recruitmentPath } from './site-paths.ts';
async function image(url:string){const img=new Image();img.src=url;await img.decode();return img}
/** Draw the same canvas that is downloaded, without embedding user markup or remote URLs. */
export async function drawMemberCard(canvas:HTMLCanvasElement,member:Member,photo:string|null,signal?:AbortSignal){
 await document.fonts.ready;
 const [logo,alphy,portrait]=await Promise.all([image(recruitmentPath('/brand/alpha-logo.webp')),image(recruitmentPath('/brand/alphy.png')),photo?image(photo):null]);
 if(signal?.aborted)throw new DOMException('Drawing cancelled','AbortError');
 canvas.width=1012;canvas.height=638;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Your browser could not create the membership card.');
 const bg=ctx.createLinearGradient(0,0,1012,638);bg.addColorStop(0,'#30445c');bg.addColorStop(1,'#080d15');ctx.fillStyle=bg;ctx.fillRect(0,0,1012,638);
 ctx.fillStyle='#ff9900';ctx.fillRect(0,0,1012,12);ctx.fillStyle='#ff9900';ctx.beginPath();ctx.moveTo(845,0);ctx.lineTo(1012,0);ctx.lineTo(1012,638);ctx.lineTo(945,638);ctx.closePath();ctx.fill();
 ctx.globalAlpha=.13;ctx.drawImage(alphy,725,235,296,326);ctx.globalAlpha=1;
 ctx.drawImage(logo,42,40,77,77);ctx.fillStyle='#fff';ctx.font='700 26px "Alpha Geist",Arial';ctx.fillText('AWS STUDENT BUILDER GROUP',139,66);ctx.fillStyle='#ffb743';ctx.font='700 29px "Alpha Geist",Arial';ctx.fillText('ALPHA',139,105);
 ctx.fillStyle='#aebfd1';ctx.font='500 16px "Alpha Geist",Arial';ctx.fillText('Rizal Technological University',44,148);
 ctx.strokeStyle='#69809a';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(44,174);ctx.lineTo(934,174);ctx.stroke();
 ctx.save();ctx.beginPath();ctx.roundRect(44,211,218,274,20);ctx.clip();ctx.fillStyle='#425670';ctx.fillRect(44,211,218,274);
 if(portrait){const scale=Math.max(218/portrait.width,274/portrait.height);const w=portrait.width*scale,h=portrait.height*scale;ctx.drawImage(portrait,44+(218-w)/2,211+(274-h)/2,w,h)}else{ctx.fillStyle='#d9e3ef';ctx.font='700 66px Arial';ctx.textAlign='center';ctx.fillText(member.full_name.split(/\s+/).slice(0,2).map(n=>n[0]).join(''),153,375);ctx.textAlign='left'}ctx.restore();
 ctx.fillStyle='#ffb743';ctx.font='600 15px "Alpha Geist",Arial';ctx.fillText('MEMBER IDENTIFICATION',304,232);
 ctx.fillStyle='#fff';let size=42;ctx.font=`700 ${size}px "Alpha Geist",Arial`;while(size>24&&ctx.measureText(member.full_name).width>600){size-=1;ctx.font=`700 ${size}px "Alpha Geist",Arial`}
 const words=member.full_name.split(/\s+/);let line='',y=292;ctx.font=`700 ${size}px "Alpha Geist",Arial`;
 for(const word of words){if(ctx.measureText(line+' '+word).width>600&&line){ctx.fillText(line,304,y,600);line=word;y+=size+7}else line=line?line+' '+word:word}ctx.fillText(line,304,y,600);
 ctx.fillStyle='#c4cfde';ctx.font='500 22px "Alpha Geist",Arial';ctx.fillText(member.position,304,Math.max(355,y+43),600);
 ctx.fillStyle='#849bb6';ctx.font='500 14px "Alpha Geist",Arial';ctx.fillText('JOINED ALPHA',304,430);ctx.fillStyle='#fff';ctx.font='600 21px "Alpha Geist",Arial';
 const date=new Date(member.joined_on+'T00:00:00Z');ctx.fillText(new Intl.DateTimeFormat('en-PH',{year:'numeric',month:'long',day:'numeric',timeZone:'UTC'}).format(date),304,462);
 ctx.fillStyle='#0a111c';ctx.beginPath();ctx.roundRect(44,528,890,66,12);ctx.fill();ctx.strokeStyle='#53657d';ctx.stroke();ctx.fillStyle='#ffb743';ctx.font='600 16px monospace';ctx.fillText(member.id,65,568);ctx.fillStyle='#aebfd1';ctx.font='500 15px "Alpha Geist",Arial';ctx.textAlign='right';ctx.fillText("IT’S ALWAYS DAY ONE.",910,568);ctx.textAlign='left';
}
