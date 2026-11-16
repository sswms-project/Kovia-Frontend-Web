// A "(DN-01)" group or a bare "DN-01" code. Bounded length, so keeping it on one line cannot overflow 320px.
const CODE_TOKEN = /(\([^()\s]{1,24}\)|[A-Za-z0-9]{1,12}(?:-[A-Za-z0-9]{1,12})+)/

/**
 * Text that may carry codes (e.g. "Đà Nẵng (DN-01)"). A hyphen is a line-break opportunity, so a
 * code would wrap as "DN-" / "01"; each code is kept whole and the line breaks before it instead.
 */
export function AiCodeText({ children }: { readonly children: string }) {
  // split() with one capture group: matches sit at the odd indexes.
  return children.split(CODE_TOKEN).map((part, index) =>
    index % 2 === 1 ? (
      <span key={index} className="whitespace-nowrap">
        {part}
      </span>
    ) : (
      part
    )
  )
}
