import type { Config, Context } from "@netlify/edge-functions";


export default async function handler(_: Request, context: Context) {

  const cgeo = context.geo.country?.code || 'IN';
  const html = `
        <div align="center">
          <svg xmlns="http://www.w3.org/2000/svg" version="1.0" viewBox="0 0 4172 4172" width="4vmin" height="4vmin" style="transform: scale(9); margin:14vmin 0;"
            >
            <path fill="var(--text)"
              d="m1368 3037-55-10-23-6a369 369 0 0 1-57-19 552 552 0 0 1-266-246 437 437 0 0 1-31-74 590 590 0 0 1-18-245l5-25c7-35 21-77 35-105l9-19a522 522 0 0 1 679-236c1 5-1 77-3 91a1059 1059 0 0 1-24 119 274 274 0 0 1-19 53c-1 0-7-5-14-13-40-46-95-77-160-91a290 290 0 0 0-186 542 287 287 0 0 0 202 23c61-15 120-54 159-105a1108 1108 0 0 0 149-360 1296 1296 0 0 0 27-274 1164 1164 0 0 0-226-667 146 146 0 0 1-21-39l-4-9-4-11c-8-16-18-53-24-84-5-27-5-72 0-95 10-49 32-84 69-115 24-20 50-34 87-47a740 740 0 0 1 79-19c23-4 134-6 167-3a1364 1364 0 0 1 446 118l20 8 20 8 18 8a2232 2232 0 0 1 652 439 1008 1008 0 0 1 234 338c4 5 16 57 20 83 2 17 1 63-3 79-18 83-71 135-171 167-34 11-106 20-130 16-43-7-194-7-249 0-67 9-142 23-179 34l-34 10a974 974 0 0 0-94 33 1245 1245 0 0 0-170 84 1182 1182 0 0 0-405 414 529 529 0 0 1-347 244c-40 9-112 11-160 6zm1441-892 14-2c21-2 58-13 76-22 34-17 54-37 67-69 6-16 7-19 7-44 1-26 1-28-6-54-32-125-167-280-368-420-80-56-200-124-282-159l-26-12a1286 1286 0 0 0-124-47c-39-14-128-36-170-42l-18-3c-19-3-41-4-87-4-56 0-71 2-105 13-68 23-101 65-101 130a201 201 0 0 0 17 82c3 9 21 46 31 64 68 112 187 227 351 338a1827 1827 0 0 0 446 214 1084 1084 0 0 0 219 39c1 1 50-1 59-2z" />
          </svg>

          ytify is a resource efficient audio streaming client for YouTube & YTMusic. <a style="text-decoration:underline;" target="_blank" href="https://github.com/n-ce/ytify/wiki/usage">Learn more about how to use the application effectively.</a>
          <br><br>
          Our new primary domain is <a style="text-decoration: underline;font-weight: bold;" href="https://ytify.pp.ua">https://ytify.pp.ua</a>.
          PWA users can reinstall from here. Data can be migrated via settings/library import. ytify.netlify.app remains active.
          <br><br>
        ${cgeo === 'IN' ?
      `<p style="font-size:smaller;margin-top:1rem">
            <img
             width="100"
              src="https://upload.wikimedia.org/wikipedia/commons/6/6f/UPI_logo.svg" />
              Please donate now at <b>animesh.5383@waicici</b> and support development, even 10rs can help.
          </p>` : "<a style='text-decoration: underline;' href='https://en.m.wikipedia.org/wiki/Individual_action_on_climate_change' target='_blank'> Keeping our consumptions low is the only way to retain our planet's ability to host mankind.</a>"
    }
      </div>
    `;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
}

export const config: Config = {
  path: "/landing",
};
