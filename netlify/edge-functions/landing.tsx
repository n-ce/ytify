// @ts-ignore
import React from "https://esm.sh/react";
// @ts-ignore
import { renderToReadableStream } from "https://esm.sh/react-dom/server";
import type { Config, Context } from "@netlify/edge-functions";


export default async function handler(_: Request, context: Context) {

  const cgeo = context.geo.country?.code || 'IN';


  const stream = await renderToReadableStream(
    <>
      <p style="
        background:url('/ytify_banner.webp') center;
        box-shadow: var(--shadow);
        border-radius: var(--roundness);
        background-size:cover;
        color:white;
        overflow:hidden;
        text-align:center;
         ">
        <i style="
          background-color: #0003;
          display:block;
          padding: 5vmin;
          backdrop-filter: blur(2px);
          ">
          Welcome to the fastest and lightest, most data efficient audio streaming platform on the web. Learn more
          about how to use
          the application effectively, <a href="https://github.com/n-ce/ytify/wiki/usage"
            style="text-decoration: underline;" target="_blank">here</a>.
        </i>
      </p>
      <p style="padding: 5vmin;color:var(--text);text-align:center">
        Attention! ytify.us.kg is now our primary domain.
        PWA users can reinstall from ytify.us.kg.
        You can easily migrate your data by importing your settings and library export files, piped playlists need not
        be imported again.
        <br />
        <br />
        {cgeo === 'IN' ?
          <a href="upi://pay?pa=animesh.5383@waicici&cu=INR" target="_blank" style="font-size:smaller;margin-top:1rem">
            <img width="100"
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/UPI_logo.svg/374px-UPI_logo.svg.png" />
            Support development
          </a> : ''
        }
      </p>
    </>
  );

  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
}

export const config: Config = {
  path: "/landing",
};
