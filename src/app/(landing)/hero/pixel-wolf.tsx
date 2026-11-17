/** Pixel interpretation of Alpha's gray wolf, cream muzzle and orange cap. */
export default function PixelWolf({ className = "", pose = "hello", dimensional = false }: {
  className?: string
  pose?: "hello" | "wink" | "wave"
  dimensional?: boolean
}) {
  const silhouette = "M64 112V24H96V40H112V64H240V40H256V24H288V112H304V144H320V160H304V192H288V224H256V256H224V272H128V256H96V240H80V208H48V192H32V176H48V144H64Z"
  return <svg className={`alpha-pixel-wolf ${dimensional ? "alpha-wolf-sculpture" : ""} ${className}`} viewBox="0 0 360 320" fill="none" aria-hidden="true" shapeRendering="crispEdges">
    {dimensional && <><ellipse cx="190" cy="296" rx="125" ry="12" fill="#090611" opacity=".35" /><path d={silhouette} transform="translate(20 -16)" fill="#453253" stroke="#261b31" strokeWidth="6" /><path d="M64 24L84 8H116L96 24ZM256 24L276 8H308L288 24ZM304 144L324 128H340V144L320 160Z" fill="#b39bc9" /></>}
    <g stroke="#332437" strokeWidth="6" strokeLinejoin="miter">
      <path d={silhouette} fill="#696978" />
      <path d="M80 96V48H88V64H96V96ZM256 96V64H264V48H272V96Z" fill="#c7adff" stroke="none" />
      <path d="M112 88V64H128V48H208V64H240V96L224 112H112Z" fill="#ff9900" />
      <path d="M112 96H256V80H288V96H304V112H288V128H240V112H144V128H112Z" fill="#ffb13e" />
      <path d="M80 176H112V192H144V208H208V192H240V176H288V208H272V224H240V240H208V256H144V240H112V224H96V208H80Z" fill="#fff0cc" stroke="none" />
      <path d="M96 144H112V128H144V144H160V192H144V208H112V192H96ZM208 144H224V128H256V144H272V192H256V208H224V192H208Z" fill="#fff8ed" stroke="none" />
      <g className="alpha-wolf-eyes" fill="#332437" stroke="none">
        <path d="M120 152H144V192H120Z" />
        {pose === "wink" ? <path d="M224 160H240V168H256V176H240V168H224Z" /> : <path d="M224 152H248V192H224Z" />}
        <path d="M128 152H136V160H128Z" fill="#fff" />
        {pose !== "wink" && <path d="M232 152H240V160H232Z" fill="#fff" />}
      </g>
      <path d="M160 192H208V208H192V224H176V208H160Z" fill="#332437" stroke="none" />
      <path d="M144 224H160V232H208V224H224V240H208V248H160V240H144Z" fill="#332437" stroke="none" />
      <path d="M176 236H200V248H192V256H176Z" fill="#ed8e96" stroke="none" />
      <path d="M144 72H192" stroke="#fff0cc" strokeWidth="8" />
    </g>
    {pose === "wave" && <g className="alpha-wolf-paw" fill="#fff8ed" stroke="#332437" strokeWidth="5"><path d="M48 208H32V192H16V160H24V144H40V152H48V144H64V160H72V184H64V200H48Z" /><path d="M32 164V180M48 164V180" strokeWidth="4" /></g>}
    {dimensional && <g className="alpha-wolf-spark" fill="#ffb13e"><path d="M320 40H328V56H344V64H328V80H320V64H304V56H320Z" /><path d="M24 248H32V256H40V264H32V272H24V264H16V256H24Z" fill="#c7adff" /></g>}
  </svg>
}
