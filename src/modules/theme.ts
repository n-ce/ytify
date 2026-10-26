import { playerStore } from "@stores";
import { config, type PanelRatio } from "@config";
import { generateImageUrl } from "@utils";

const style =
  typeof document !== "undefined"
    ? document.documentElement.style
    : ({} as CSSStyleDeclaration);
const cssVar = style.setProperty ? style.setProperty.bind(style) : () => {};
const tabColor =
  typeof document !== "undefined"
    ? <HTMLMetaElement>document.head?.children?.namedItem("theme-color")
    : ({} as HTMLMetaElement);
const systemDark =
  typeof window !== "undefined"
    ? matchMedia("(prefers-color-scheme:dark)")
    : ({
        matches: false,
        addEventListener: () => {},
      } as unknown as MediaQueryList);

function accentDarkener(r: number, g: number, b: number) {
  let min = Math.min(r, g, b);

  if ((r + g + b) / min > 14) {
    r = Math.floor(r / 3);
    g = Math.floor(g / 3);
    b = Math.floor(b / 3);
    min = Math.floor(min / 3);
  }
  return `rgb(${r - min}, ${g - min},${b - min})`;
}

const palette = {
  light: {
    bg: "#fff",
    text: "#000",
    multiplier: "1.1",
  },
  dark: {
    bg: "#000",
    text: "#fff",
    multiplier: "0.9",
  },
};

function colorInjector(colorArray: number[]) {
  const autoDark = systemDark.matches;
  Promise.resolve().then(() => {
    const { theme } = config;
    const scheme = theme === "auto" ? (autoDark ? "dark" : "light") : theme;

    const [r, g, b] = colorArray;

    if (Math.abs(r - g) < 10 && Math.abs(g - b) < 10) cssVar("--chroma", "0");
    else cssVar("--chroma", "1");

    cssVar("--trueBg", scheme === "light" ? "var(--scheme)" : "var(--bg)");

    cssVar("--source", accentDarkener(r, g, b));
    cssVar("--bg", palette[scheme].bg);
    cssVar("--schemeMultiplier", palette[scheme].multiplier);
    cssVar("--text", palette[scheme].text);
    if (tabColor) tabColor.content = palette[scheme].bg;
  });
}

export function themer() {
  const initColor = "220, 220, 220";
  const { stream } = playerStore;
  const { loadImage } = config;
  if (loadImage && stream?.id)
    import("./extractColorFromImage")
      .then((mod) => mod.default)
      .then((e) => e(generateImageUrl(stream.id, "mq"), true))
      .then(colorInjector);
  else colorInjector(initColor.split(",").map((s) => parseInt(s)));
}

export function applyPanelRatio(ratio: PanelRatio | string) {
  const [left, right] = (ratio || "2:5").split(":");
  if (typeof document !== "undefined" && document.documentElement) {
    document.documentElement.style.setProperty("--panelRatioLeft", left || "2");
    document.documentElement.style.setProperty(
      "--panelRatioRight",
      right || "5",
    );
  }
}

applyPanelRatio(config?.panelRatio || "2:5");

systemDark.addEventListener("change", themer);

export { cssVar };
