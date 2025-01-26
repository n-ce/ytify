declare global {

  type StreamItem = {
    url: string,
    type: string,
    name: string,
    views: number,
    title: string,
    videos: number,
    duration: number,
    isShort?: boolean,
    thumbnail: string,
    subscribers: number,
    description: string,
    uploaderUrl: string,
    thumbnailUrl: string,
    playlistType: string,
    uploadedDate: string,
    uploaderName: string,
    uploaderAvatar: string,
    /* invidious fields */
    lengthSeconds: number,
    publishedText: string,
    viewCountText: string,
    viewCount: number,
    authorUrl: string,
    videoId: string,
    author: string
  }

  type CollectionItem = {
    id: string,
    title: string,
    author: string,
    duration: string
    channelUrl: string
  }

  type List = Record<'id' | 'name' | 'thumbnail', string>
  type Collection = {
    [index: string]: CollectionItem | DOMStringMap
  }

  type Library = {
    history?: Collection,
    favorites: Collection,
    listenLater: Collection,
    discover?: {
      [index: string]: CollectionItem & { frequency: number }
    },
    channels: { [index: string]: List & { uploader: string } },
    playlists: { [index: string]: List },
    [index: string]: Collection
  }

  type SuperCollection = 'featured' | 'collections' | 'channels' | 'feed' | 'playlists' | 'for_you';

  type Scheme = {
    [index: string]: {
      bg: (r: number, g: number, b: number) => string,
      borderColor: (r: number, g: number, b: number) => string,
      shadowColor: string,
      onBg: string,
      text: string
    }
  }

  type ToggleSwitch = {
    name: string
    id: string,
    checked: boolean,
    onClick: (e: EventHandler<HTMLInputElement>) => void
  }

  type Selector = {
    label: string,
    id: string,
    onChange: (e: { target: HTMLSelectElement }) => void,
    onMount: (target: HTMLSelectElement) => void,
    children: JSXElement
  }

  type Piped = {
    instance: string,
    title: string,
    uploader: string,
    duration: number,
    uploader: string,
    uploaderUrl: string,
    livestream: boolean,
    subtitles: [],
    hls: string
    relatedStreams: {
      url: string,
      title: string,
      uploaderName: string,
      duration: number,
      uploaderUrl: string,
      type: string
    }[],
    audioStreams: {
      codec: string,
      url: string,
      quality: string,
      bitrate: string,
      contentLength: number,
      mimeType: string
    }[]
  }

  type Invidious = {
    adaptiveFormats: Record<'type' | 'bitrate' | 'encoding' | 'clen' | 'url', string>[],
    recommendedVideos: {
      title: string,
      author: string,
      lengthSeconds: number,
      authorUrl: string,
      videoId: string
    }[],
    title: string,
    author: string,
    lengthSeconds: number,
    authorUrl: string,
    liveNow: boolean,
    hlsUrl: string,
    dashUrl: string,
    videoThumbnails: Record<'url' | 'quality', string>[]
  }

  interface EventTarget {
    id: string
  }



  type TranslationKeys = Record<
    | 'nav_search'
    | 'nav_library'
    | 'nav_settings'
    | 'nav_upcoming'
    | 'player_setup_audiostreams'
    | 'player_livestreams_hls'
    | 'player_audiostreams_null'
    | 'player_now_playing'
    | 'player_channel'
    | 'player_volume'
    | 'player_loop'
    | 'player_more'
    | 'player_play_button'
    | 'player_play_previous'
    | 'player_seek_backward'
    | 'player_seek_forward'
    | 'player_play_next'
    | 'upcoming_clear'
    | 'upcoming_shuffle'
    | 'upcoming_remove'
    | 'upcoming_filter'
    | 'upcoming_enqueue_related'
    | 'upcoming_allow_duplicates'
    | 'upcoming_info'
    | 'fetchlist_url_null'
    | 'fetchlist_error'
    | 'fetchlist_nonexistent'
    | 'search_placeholder'
    | 'search_filter_all'
    | 'search_filter_videos'
    | 'search_filter_channels'
    | 'search_filter_playlists'
    | 'search_filter_music_songs'
    | 'search_filter_music_artists'
    | 'search_filter_music_videos'
    | 'search_filter_music_albums'
    | 'search_filter_music_playlists'
    | 'search_filter_sort_by'
    | 'search_filter_date'
    | 'search_filter_views'
    | 'library_discover'
    | 'library_history'
    | 'library_favorites'
    | 'library_listen_later'
    | 'library_featured'
    | 'library_collections'
    | 'library_playlists'
    | 'library_albums'
    | 'library_artists'
    | 'library_channels'
    | 'library_feed'
    | 'library_for_you'
    | 'library_import'
    | 'library_export'
    | 'library_clean'
    | 'list_play'
    | 'list_enqueue'
    | 'list_import'
    | 'list_imported'
    | 'list_set_title'
    | 'list_clear_all'
    | 'list_remove'
    | 'list_delete'
    | 'list_rename'
    | 'list_share'
    | 'list_radio'
    | 'list_sort'
    | 'list_info'
    | 'actions_menu_play_next'
    | 'actions_menu_enqueue'
    | 'actions_menu_start_radio'
    | 'actions_menu_download'
    | 'actions_menu_watch_on'
    | 'actions_menu_view_artist'
    | 'actions_menu_view_lyrics'
    | 'actions_menu_view_channel'
    | 'actions_menu_debug_info'
    | 'collection_selector_add_to'
    | 'collection_selector_create_new'
    | 'collection_selector_favorites'
    | 'collection_selector_listen_later'
    | 'settings_feedback_placeholder'
    | 'settings_feedback_submit'
    | 'settings_changelog'
    | 'settings_clear_cache'
    | 'settings_restore'
    | 'settings_export'
    | 'settings_import'
    | 'settings_custom_instance'
    | 'settings_links_host'
    | 'settings_image_loading'
    | 'settings_image_eager'
    | 'settings_image_lazy'
    | 'settings_image_off'
    | 'settings_download_format'
    | 'settings_pwa_share_action'
    | 'settings_search'
    | 'settings_set_songs_as_default_filter'
    | 'settings_display_suggestions'
    | 'settings_playback'
    | 'settings_hq_audio'
    | 'settings_codec_preference'
    | 'settings_always_proxy_streams'
    | 'settings_stable_volume'
    | 'settings_hls'
    | 'settings_library'
    | 'settings_set_as_default_tab'
    | 'settings_store_discoveries'
    | 'settings_store_history'
    | 'settings_import_from_piped'
    | 'settings_interface'
    | 'settings_roundness'
    | 'settings_use_custom_color'
    | 'settings_custom_color_prompt'
    | 'settings_theming_scheme'
    | 'settings_theming_scheme_dynamic'
    | 'settings_theming_scheme_system'
    | 'settings_theming_scheme_light'
    | 'settings_theming_scheme_dark'
    | 'settings_theming_scheme_hc'
    | 'settings_theming_scheme_hc_system'
    | 'settings_theming_scheme_white'
    | 'settings_theming_scheme_black'
    | 'settings_parental_controls'
    | 'settings_pin_toggle'
    | 'settings_pin_message'
    | 'settings_pin_prompt'
    | 'settings_pin_incorrect'
    | 'settings_language'
    | 'settings_enter_piped_api'
    | 'settings_enter_invidious_api'
    | 'settings_opus_recommended'
    | 'settings_pwa_play'
    | 'settings_pwa_download'
    | 'settings_pwa_always_ask'
    | 'settings_clear_discoveries'
    | 'settings_clear_history'
    | 'settings_roundness_none'
    | 'settings_roundness_lighter'
    | 'settings_roundness_light'
    | 'settings_roundness_heavy'
    | 'settings_roundness_heavier'
    | 'settings_fullscreen'
    | 'piped_enter_auth'
    | 'piped_enter_username'
    | 'piped_enter_password'
    | 'piped_success_auth'
    | 'piped_failed_auth'
    | 'piped_success_imported'
    | 'piped_failed_imported'
    | 'piped_success_fetched'
    | 'piped_failed_find'
    | 'piped_failed_login'
    | 'piped_failed_token'
    | 'piped_success_logged'
    | 'updater_changelog_full'
    | 'updater_button'
    | 'pwa_share_prompt'
    , string>;


}


export { };

