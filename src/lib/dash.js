import { useXML } from './xml.js';

export function useDash(streams, len) {
  const sets = [],
    mimes = [[]],
    mimeTypes = [];

  streams.forEach(stream => {
    const i = mimeTypes.indexOf(stream.mimeType);

    if (i > -1) mimes[i].push(stream);
    else {
      mimeTypes.push(stream.mimeType);
      mimes.push([]);
      mimes[mimeTypes.length - 1].push(stream);
    }
  });

  for (let i in mimeTypes) {
    const set = {
      name: 'AdaptationSet',
      attr: {
        id: i,
        contentType: 'audio',
        mimeType: mimeTypes[i],
        startWithSAP: '1',
        subsegmentAlignment: 'true',
      },
      child: [],
    };

    mimes[i].forEach(format => {
      const audio = {
        name: 'Representation',
        attr: {
          id: format.itag,
          codecs: format.codec,
          bandwidth: format.bitrate,
        },
        child: [
          {
            name: 'AudioChannelConfiguration',
            attr: {
              schemeIdUri:
                'urn:mpeg:dash:23003:3:audio_channel_configuration:2011',
              value: '2',
            },
          },
          {
            name: 'BaseURL',
            child: [format.url],
          },
          {
            name: 'SegmentBase',
            attr: {
              indexRange: `${format.indexStart}-${format.indexEnd}`,
            },
            child: [
              {
                name: 'Initialization',
                attr: {
                  range: `${format.initStart}-${format.initEnd}`,
                },
              },
            ],
          },
        ],
      };

      set.child.push(audio);
    });

    sets.push(set);
  }

  const gen = [
    {
      name: 'MPD',
      attr: {
        xmlns: 'urn:mpeg:dash:schema:mpd:2011',
        profiles: 'urn:mpeg:dash:profile:full:2011',
        minBufferTime: 'PT1.5S',
        type: 'static',
        mediaPresentationDuration: `PT${len}S`,
      },
      child: [
        {
          name: 'Period',
          attr: { id: 0 },
          child: sets,
        },
      ],
    },
  ];

  return useXML(gen);
}
