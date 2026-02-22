interface Props {
    index: string;
    title: string;
    sub?:  string;
    color?: string;
  }
  
  export default function SectionHeader({ index, title, sub, color = "var(--ember)" }: Props) {
    return (
      <div className="flex items-center gap-4 mb-5">
        <div
          className="font-mono text-xs font-bold shrink-0"
          style={{
            color,
            background: `${color}12`,
            border:     `1px solid ${color}30`,
            padding:    "3px 8px",
            borderRadius: "2px",
            letterSpacing: "0.1em",
          }}
        >
          {index}
        </div>
        <div>
          <h2
            className="font-display font-bold uppercase tracking-wider"
            style={{ fontSize: "17px", color: "#f0f4f8", letterSpacing: "0.06em" }}
          >
            {title}
          </h2>
          {sub && <p className="sec-label mt-0.5">{sub}</p>}
        </div>
        <div className="flex-1 h-px ml-2" style={{ background: `${color}18` }} />
      </div>
    );
  }