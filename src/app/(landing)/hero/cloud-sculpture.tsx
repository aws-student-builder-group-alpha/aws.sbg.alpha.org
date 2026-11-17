export default function CloudSculpture() {
 const outline = "M120 85H216V109H248V141H280V165H304V213H280V237H80V213H56V165H80V141H104V109H120Z"
 return <svg viewBox="0 0 400 330" fill="none" className="alpha-cloud-sculpture" aria-hidden="true">
  <defs>
   <linearGradient id="alpha-cloud-face" x1="95" y1="100" x2="275" y2="235" gradientUnits="userSpaceOnUse"><stop stopColor="#f7e9ff" /><stop offset="1" stopColor="#bd91f3" /></linearGradient>
   <linearGradient id="alpha-cloud-top" x1="150" y1="50" x2="300" y2="160" gradientUnits="userSpaceOnUse"><stop stopColor="#fff4de" /><stop offset="1" stopColor="#cba4ff" /></linearGradient>
   <pattern id="alpha-cloud-pixels" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" stroke="#7650a3" strokeOpacity=".14" /></pattern>
  </defs>
  <ellipse cx="208" cy="292" rx="112" ry="14" fill="#06030f" opacity=".4" />
  <g stroke="#372043" strokeWidth="2" strokeLinejoin="miter">
   <path d={outline} transform="translate(44 -36)" fill="#8052b8" />
   <path d="M120 85L164 49H260L216 85H120ZM104 109L148 73H164L120 109H104ZM80 141L124 105H148L104 141H80ZM56 165L100 129H124L80 165H56Z" fill="url(#alpha-cloud-top)" />
   <path d="M216 85L260 49V73L216 109V85ZM248 109L292 73V105L248 141V109ZM280 141L324 105V129L280 165V141ZM304 165L348 129V177L304 213V165ZM280 213L324 177V201L280 237V213Z" fill="#8453bd" />
   <path d={outline} fill="url(#alpha-cloud-face)" />
   <path d={outline} fill="url(#alpha-cloud-pixels)" stroke="none" />
  </g>
  <path d="M126 148H143V172H126ZM216 148H233V172H216Z" fill="#35233f" />
  <path d="M130 150H135V155H130ZM220 150H225V155H220Z" fill="#fff" />
  <path d="M145 194H161V204H200V194H216V215H201V225H160V215H145V194Z" fill="#ff9900" />
  <path d="M82 175H106V182H82ZM254 175H278V182H254Z" fill="#cb86d8" opacity=".7" />
  <g className="alpha-cloud-cube alpha-cloud-cube-one" stroke="#653816" strokeWidth="1.5"><path d="M40 55L56 43L74 51L58 63Z" fill="#ffe5a9"/><path d="M40 55L58 63V82L40 74Z" fill="#ffb13e"/><path d="M58 63L74 51V70L58 82Z" fill="#d57212"/></g>
  <g className="alpha-cloud-cube alpha-cloud-cube-two" stroke="#4f326a" strokeWidth="1.5"><path d="M316 255L333 243L352 251L335 263Z" fill="#e3ccff"/><path d="M316 255L335 263V282L316 274Z" fill="#b88aeb"/><path d="M335 263L352 251V270L335 282Z" fill="#71409b"/></g>
 </svg>
}
