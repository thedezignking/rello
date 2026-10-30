import { ImageResponse } from "next/og";

// The share card for every page that doesn't set its own. Same idea as the
// landing hero: the promise on the left, a resume with one line marked and
// its suggestion on the right. The highlighter on "fit the job" is the same
// mark the editor uses for lines it suggests changing.

export const alt = "Rello: resumes that fit the job. Tailor one resume to every job, line by line.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const C = {
  canvas: "#eef0f3",
  ink: "#15171c",
  muted: "#5d6470",
  line: "#dce0e6",
  primary: "#2546c8",
  mark: "#ffe27a",
  markSoft: "#fff1b8",
  bar: "#e3e6eb",
};

/** Fetches just the glyphs we draw, as TTF, from Google Fonts. */
async function font(family: string, weight: 400 | 500 | 600, text: string) {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}&text=${encodeURIComponent(text)}`,
    ).then((r) => r.text());
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    return { name: family, data: await fetch(url).then((r) => r.arrayBuffer()), weight, style: "normal" as const };
  } catch {
    return null; // Falls back to the built-in font rather than failing the build.
  }
}

const HEADING = "rello.Resumes that fit the job.";
const BODY =
  "Tailor one resume to every job, line by line. You approve every change.Nothing made up, everAmara OkaforProduct DesignerSuggested for this jobBuilt and maintain the Figma design system used across three product teams.AcceptReject";

function Bar({ w, mark, strong }: { w: number; mark?: boolean; strong?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        height: 9,
        width: w,
        borderRadius: 5,
        background: mark ? C.mark : strong ? "#c9ced7" : C.bar,
      }}
    />
  );
}

export default async function Image() {
  const fonts = (
    await Promise.all([font("Newsreader", 500, HEADING), font("Onest", 400, BODY), font("Onest", 600, BODY)])
  ).filter((f) => f !== null);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: C.canvas,
          fontFamily: "Onest",
          color: C.ink,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Left: the promise */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: 600,
            padding: "64px 0 60px 72px",
          }}
        >
          <div style={{ display: "flex", fontFamily: "Newsreader", fontSize: 40, fontWeight: 500, letterSpacing: -1 }}>
            rello<span style={{ color: C.primary }}>.</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                fontFamily: "Newsreader",
                fontSize: 82,
                fontWeight: 500,
                lineHeight: 1.02,
                letterSpacing: -2.5,
              }}
            >
              <span>Resumes that</span>
              <span style={{ display: "flex" }}>
                <span
                  style={{
                    background: `linear-gradient(transparent 22%, ${C.mark} 22%, ${C.mark} 88%, transparent 88%)`,
                    padding: "0 8px",
                    margin: "0 -8px",
                  }}
                >
                  fit the job.
                </span>
              </span>
            </div>
            <div style={{ display: "flex", fontSize: 27, lineHeight: 1.45, color: C.muted, maxWidth: 470 }}>
              Tailor one resume to every job, line by line. You approve every change.
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 20, color: C.muted }}>
            <div style={{ display: "flex", width: 8, height: 8, borderRadius: 4, background: C.primary }} />
            Nothing made up, ever
          </div>
        </div>

        {/* Right: the product doing it */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            left: 680,
            top: 78,
            width: 440,
            height: 620,
            flexDirection: "column",
            gap: 14,
            padding: "40px 40px",
            background: "#ffffff",
            borderRadius: 10,
            border: `1px solid ${C.line}`,
            boxShadow: "0 30px 60px -20px rgba(21,23,28,0.25)",
            transform: "rotate(-2deg)",
          }}
        >
          <div style={{ display: "flex", fontSize: 30, fontWeight: 600, letterSpacing: -0.5 }}>Amara Okafor</div>
          <div style={{ display: "flex", fontSize: 17, color: C.primary, marginTop: -8 }}>Product Designer</div>
          <div style={{ display: "flex", height: 1, background: C.line, margin: "10px 0 6px" }} />
          <Bar w={120} strong />
          <Bar w={350} />
          <Bar w={310} mark />
          <div style={{ display: "flex", height: 10 }} />
          <Bar w={150} strong />
          <Bar w={340} />
          <Bar w={300} />
          <Bar w={325} />
          <div style={{ display: "flex", height: 10 }} />
          <Bar w={110} strong />
          <Bar w={280} />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            position: "absolute",
            left: 610,
            top: 372,
            width: 440,
            padding: "24px 26px",
            gap: 12,
            background: "#ffffff",
            borderRadius: 18,
            border: `1px solid ${C.line}`,
            boxShadow: "0 32px 64px -18px rgba(21,23,28,0.32)",
          }}
        >
          <div style={{ display: "flex", fontSize: 16, color: C.muted }}>Suggested for this job</div>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 22, lineHeight: 1.45 }}>
            {/* Set as two lines: the renderer lays out each run as its own box. */}
            <div style={{ display: "flex", whiteSpace: "nowrap" }}>
              <span style={{ flexShrink: 0 }}>Built and maintain the</span>
              <span style={{ flexShrink: 0, background: C.markSoft, borderRadius: 3, padding: "0 4px", margin: "0 6px" }}>
                Figma
              </span>
            </div>
            <div style={{ display: "flex" }}>design system used across three product teams.</div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                height: 38,
                padding: "0 16px",
                borderRadius: 9,
                background: C.primary,
                color: "#ffffff",
                fontSize: 17,
                fontWeight: 600,
              }}
            >
              Accept
            </div>
            <div style={{ display: "flex", alignItems: "center", height: 38, padding: "0 14px", fontSize: 17, color: C.muted }}>
              Reject
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
