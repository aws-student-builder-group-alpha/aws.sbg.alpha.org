import Image from "next/image"

export default function AwsBuildMark({ showNetwork = false }: { showNetwork?: boolean }) {
 return <div className="alpha-build-mark" aria-hidden="true">
  <Image className="alpha-hero-aws-logo" src="/aws-logo-white.png" width={118} height={70} alt="" priority />
  {showNetwork && <svg className="alpha-cloud-network" viewBox="0 0 280 90" fill="none">
   <g className="alpha-cloud-paths">
    <path d="M0 45H55Q70 45 70 30V18Q70 13 85 13H150" />
    <path d="M0 45H150" />
    <path d="M0 45H55Q70 45 70 60V72Q70 77 85 77H150" />
   </g>
   <g className="alpha-cloud-signals">
    <path d="M0 45H55Q70 45 70 30V18Q70 13 85 13H150" />
    <path d="M0 45H150" />
    <path d="M0 45H55Q70 45 70 60V72Q70 77 85 77H150" />
   </g>
   {[{ y: 1, label: "λ  Lambda" }, { y: 33, label: "▦  S3" }, { y: 65, label: "⌘  EC2" }].map(({y,label}) => <g key={label} className="alpha-cloud-node">
    <rect x="150" y={y} width="110" height="24" rx="5" />
    <circle cx="162" cy={y + 12} r="2" />
    <text x="174" y={y + 16}>{label}</text>
   </g>)}
  </svg>}
 </div>
}
