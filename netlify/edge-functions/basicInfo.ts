import { Config, Context } from "@netlify/edge-functions";
import { Innertube } from "youtubei.js";

const tube = Innertube.create();

export default async (_: Request, context: Context) => {
  const { id } = context.params;

  if (!id || id.length < 11) return;

  const info = await tube
    .then(_ => (_.getBasicInfo(id)).basic_info)
    .then(_ => ({
      id: _.id,
      title: _.title,
      author: _.author,
      duration: convertSStoHHMMSS(_.duration as number),
      channelUrl: "/channel/" + _.channel_id
    }));

  return new Response(JSON.stringify(info), {
    headers: { "content-type": "application/json" },
  });
};

export const config: Config = {
  path: "/basic/:id",
};

export function convertSStoHHMMSS(seconds: number): string {
  if (seconds < 0) return "";
  if (seconds === Infinity) return "Emergency Mode";
  const hh = Math.floor(seconds / 3600);
  seconds %= 3600;
  const mm = Math.floor(seconds / 60);
  const ss = Math.floor(seconds % 60);
  let mmStr = String(mm);
  let ssStr = String(ss);
  if (mm < 10) mmStr = "0" + mmStr;
  if (ss < 10) ssStr = "0" + ssStr;
  return (hh > 0 ? hh + ":" : "") + `${mmStr}:${ssStr}`;
}
