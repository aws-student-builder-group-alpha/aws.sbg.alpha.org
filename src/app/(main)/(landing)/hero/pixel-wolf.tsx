type WolfExpression = "hello" | "wink" | "wave"

const outfits = {
  opening: { crown: "#ff9900", brim: "#ffb13e", pose: "hello" },
  learn: { crown: "#217e88", brim: "#5ed9d1", pose: "hello" },
  build: { crown: "#ffc139", brim: "#ffdd77", pose: "wink" },
  people: { crown: "#bd578a", brim: "#ff9ebf", pose: "wave" },
  roles: { crown: "#7250ae", brim: "#ad8fe7", pose: "hello" },
  community: { crown: "#263e74", brim: "#85a9f9", pose: "wink" },
  team: { crown: "#20855d", brim: "#6be2a7", pose: "wave" },
  closing: { crown: "#6f78bb", brim: "#b4bdfd", pose: "hello" },
} satisfies Record<string, { crown: string; brim: string; pose: WolfExpression }>

export type WolfLook = keyof typeof outfits

export function isWolfLook(value: string | undefined): value is WolfLook {
  return value !== undefined && Object.hasOwn(outfits, value)
}

export function WolfPerch({ className, look }: { className: string; look: WolfLook }) {
  return <span className={className} data-wolf-stop={look} aria-hidden="true"><PixelWolf look={look} dimensional /></span>
}

/** Pixel interpretation of Alpha's gray wolf and cream muzzle. */
export default function PixelWolf({ className = "", look = "opening", pose, dimensional = false, tilt = 0 }: {
  className?: string
  look?: WolfLook
  pose?: WolfExpression
  dimensional?: boolean
  tilt?: number
}) {
  const outfit = outfits[look]
  const expression = pose ?? outfit.pose
  const silhouette = "M64 112V24H96V40H112V64H240V40H256V24H288V112H304V144H320V160H304V192H288V224H256V256H224V272H128V256H96V240H80V208H48V192H32V176H48V144H64Z"
  return <svg className={`alpha-pixel-wolf ${dimensional ? "alpha-wolf-sculpture" : ""} ${className}`} data-wolf-look={look} viewBox="0 0 360 320" fill="none" aria-hidden="true" shapeRendering="crispEdges">
    <g transform={tilt ? `rotate(${tilt} 180 160)` : undefined}>
    {dimensional && <><ellipse cx="190" cy="296" rx="125" ry="12" fill="#090611" opacity=".35" /><path d={silhouette} transform="translate(20 -16)" fill="#453253" stroke="#261b31" strokeWidth="6" /><path d="M64 24L84 8H116L96 24ZM256 24L276 8H308L288 24ZM304 144L324 128H340V144L320 160Z" fill="#b39bc9" /></>}
    <g stroke="#332437" strokeWidth="6" strokeLinejoin="miter">
      <path d={silhouette} fill="#696978" />
      <path d="M80 96V48H88V64H96V96ZM256 96V64H264V48H272V96Z" fill="#c7adff" stroke="none" />
      {look === "build" ? <>
        <path d="M88 94H104V69H119V54H140V43H156V34H204V43H223V54H243V69H256V94Z" fill={outfit.crown} />
        <path d="M155 93V51H167V39H191V51H203V93" fill="#ffd960" />
        <path d="M73 94H272V103H289V119H94V111H73Z" fill={outfit.brim} />
      </> : look === "team" ? <>
        <path d="M64 101H288V131H64Z" fill={outfit.crown} />
        <path d="M68 105H284V111H68ZM84 120H272V126H84Z" fill={outfit.brim} stroke="none" />
        <path d="M160 90H194V98H201V126H194V134H160V126H153V98H160Z" fill="#fff0cc" />
        <path d="M165 124V104H171V100H183V104H189V124H182V117H172V124ZM172 111H182V106H172Z" fill="#216345" stroke="none" />
      </> : <>
        <path d="M112 88V64H128V48H208V64H240V96L224 112H112Z" fill={outfit.crown} />
        <path d="M112 96H256V80H288V96H304V112H288V128H240V112H144V128H112Z" fill={outfit.brim} />
        <path d="M144 72H192" stroke="#fff0cc" strokeWidth="8" />
      </>}
      <path d="M80 176H112V192H144V208H208V192H240V176H288V208H272V224H240V240H208V256H144V240H112V224H96V208H80Z" fill="#fff0cc" stroke="none" />
      <path d="M96 144H112V128H144V144H160V192H144V208H112V192H96ZM208 144H224V128H256V144H272V192H256V208H224V192H208Z" fill="#fff8ed" stroke="none" />
      <g className="alpha-wolf-eyes" fill="#332437" stroke="none">
        <path d="M120 152H144V192H120Z" />
        {expression === "wink" ? <path d="M224 160H240V168H256V176H240V168H224Z" /> : <path d="M224 152H248V192H224Z" />}
        <path d="M128 152H136V160H128Z" fill="#fff" />
        {expression !== "wink" && <path d="M232 152H240V160H232Z" fill="#fff" />}
      </g>
      <path d="M160 192H208V208H192V224H176V208H160Z" fill="#332437" stroke="none" />
      <path d="M144 224H160V232H208V224H224V240H208V248H160V240H144Z" fill="#332437" stroke="none" />
      <path d="M176 236H200V248H192V256H176Z" fill="#ed8e96" stroke="none" />
    </g>
    {look === "learn" && <g stroke="#263a50" strokeWidth="8" strokeLinejoin="miter">
      <path d="M80 144H163V154H170V183H157V197H103V188H91V157H80ZM188 154H195V144H278V157H267V188H255V197H201V183H188Z" fill="#9aeae5" fillOpacity=".28" />
      <path d="M169 159H189" />
      <path d="M104 156H116M207 156H219" stroke="#e5ffff" strokeWidth="5" />
    </g>}
    {look === "people" && <g stroke="#503047" strokeWidth="5">
      <path d="M90 220H109V230H133V244H218V234H259V245H237V260H224V277H154V269H120V257H102V242H90Z" fill="#f77ca7" />
      <path d="M221 251H245V258H258V279H248V288H228V277H221Z" fill="#c64e82" />
      <path d="M309 190H321V198H329V190H341V198H348V213H339V222H329V230H321V222H311V213H302V198H309Z" fill="#ff9ebf" />
    </g>}
    {look === "roles" && <g stroke="#352547" strokeWidth="5">
      <path d="M72 191H84L135 242H165V254H136L72 203ZM232 242L269 212H283V222L238 255H210V242Z" fill="#ad8fe7" />
      <path d="M146 252H220V291H146Z" fill="#f0e7ff" />
      <path d="M155 262H176V282H155Z" fill="#7250ae" stroke="none" />
      <path d="M185 266H211M185 277H204" stroke="#7250ae" />
    </g>}
    {look === "community" && <g stroke="#252034" strokeWidth="6">
      <path d="M222 218H239V207H280V218H314V226H332V274H317V285H222V277H211V228H222Z" fill="#878cc3" />
      <path d="M232 230H250M304 233H316" stroke="#fff0cc" />
      <path d="M261 226H290V235H302V264H290V274H261V264H250V235H261Z" fill="#38385e" />
      <path d="M265 240H285V259H265Z" fill="#91e1ff" stroke="none" />
      <path d="M269 240H277V248H269Z" fill="#fff" stroke="none" />
    </g>}
    {look === "team" && <path d="M94 181H114V187H101V194H89V188ZM250 181H270L275 188V194H263V187H250Z" fill="#25966b" />}
    {look === "closing" && <g strokeLinejoin="miter">
      <path d="M114 42H89V56H70V74H55V97H46V211H56V237H78V254H104V269H139V280H221V269H257V252H281V237H304V209H315V97H302V74H285V56H261V42H232" stroke="#392c50" strokeWidth="24" />
      <path d="M114 42H89V56H70V74H55V97H46V211H56V237H78V254H104V269H139V280H221V269H257V252H281V237H304V209H315V97H302V74H285V56H261V42H232" stroke="#ddd8fd" strokeWidth="14" />
      <path d="M46 132H60V184H46M315 132H301V184H315" stroke="#8d91d4" strokeWidth="12" />
      <path d="M80 96H91V79H109V66H132M236 220H254V209H268" stroke="#f9f5ff" strokeWidth="7" />
    </g>}
    {expression === "wave" && <g className="alpha-wolf-paw" fill="#fff8ed" stroke="#332437" strokeWidth="5"><path d="M48 208H32V192H16V160H24V144H40V152H48V144H64V160H72V184H64V200H48Z" /><path d="M32 164V180M48 164V180" strokeWidth="4" /></g>}
    {dimensional && <g className="alpha-wolf-spark" fill="#ffb13e"><path d="M320 40H328V56H344V64H328V80H320V64H304V56H320Z" /><path d="M24 248H32V256H40V264H32V272H24V264H16V256H24Z" fill="#c7adff" /></g>}
    </g>
  </svg>
}
