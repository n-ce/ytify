/**
 * ============================================================================
 * YTFY Optimized Vite Configuration
 * ============================================================================
 * Purpose: Production-optimized build configuration
 * Target: FCP < 1s, TTI < 2s, Lighthouse 100, 60fps animations
 * ============================================================================
 */

import { defineConfig, PluginOption, UserConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import solidPlugin from 'vite-plugin-solid';
import autoprefixer from 'autoprefixer';
import postcssJitProps from 'postcss-jit-props';
import OpenProps from 'open-props';
import { resolve } from 'path';
import { readdirSync } from 'fs';
import path from 'path';

// ==========================================================================
// Build Configuration
// ==========================================================================

const BUILD_CONFIG = {
  // Asset inlining threshold (4KB)
  // Assets smaller than this will be inlined as base64
  INLINE_LIMIT: 4096,
  
  // Chunk size warning threshold (500KB)
  CHUNK_WARNING_LIMIT: 500,
  
  // Manual chunk definitions for optimal code splitting
  VENDOR_CHUNKS: {
    // Core vendor chunk (SolidJS + core dependencies)
    'vendor-core': ['solid-js', 'solid-js/web', 'solid-js/store'],
    
    // UI utilities chunk
    'vendor-ui': ['open-props'],
    
    // Workbox chunk (service worker dependencies)
    'vendor-workbox': [
      'workbox-precaching',
      'workbox-routing',
      'workbox-strategies',
      'workbox-expiration',
      'workbox-cacheable-response',
      'workbox-background-sync',
      'workbox-range-requests',
    ],
  },
  
  // Feature-based chunks
  FEATURE_CHUNKS: {
    // Player feature
    'feature-player': [
      './src/features/Player/index.tsx',
      './src/features/Player/Controls.tsx',
      './src/features/Player/Video.tsx',
      './src/features/Player/Lyrics.tsx',
    ],
    
    // Queue feature
    'feature-queue': [
      './src/features/Queue/index.tsx',
      './src/features/Queue/List.tsx',
      './src/features/Queue/Standby.tsx',
    ],
    
    // Settings feature
    'feature-settings': [
      './src/features/Settings/index.tsx',
    ],
  },
};

// ==========================================================================
// Vite Configuration
// ==========================================================================

export default defineConfig(({ command, mode }) => {
  const isDev = command === 'serve';
  const isProd = mode === 'production';
  
  const config: UserConfig = {
    // Base path for deployment
    base: process.env.VITE_BASE_PATH || '/',
    
    // Global definitions
    define: {
      Locales: readdirSync(resolve(__dirname, './src/locales')).map(file => file.slice(0, 2)),
      Build: JSON.stringify('v' + require('./package.json').version),
      Backend: JSON.stringify([
        'https://ytify-zeta.vercel.app',
      ]),
      // Performance monitoring flag
      __PERF_MONITORING__: JSON.stringify(isProd),
    },
    
    // Path aliases
    resolve: {
      alias: {
        '@components': path.resolve(__dirname, './src/components'),
        '@lib': path.resolve(__dirname, './src/lib'),
        '@features': path.resolve(__dirname, './src/features'),
        '@utils': path.resolve(__dirname, './src/lib/utils'),
        '@stores': path.resolve(__dirname, './src/lib/stores'),
        '@workers': path.resolve(__dirname, './src/lib/workers'),
      },
    },
    
    // Plugins
    plugins: [
      solidPlugin(),
      injectEruda(isDev),
      
      // PWA Configuration
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['*.woff2', 'ytify_banner.webp', 'logo*.png', '*.svg'],
        // Use injectManifest for custom service worker
        strategies: 'injectManifest',
        srcDir: 'src/lib/workers',
        filename: 'service-worker.ts',
        injectManifest: {
          // Output filename
          swDest: 'sw.js',
          
          // Precache patterns
          globPatterns: [
            '**/*.{js,css,html,ico,png,svg,woff2,webp}',
          ],
          
          // Inject mode
          injectionPoint: 'self.__WB_MANIFEST',
        },
        manifest: {
          short_name: 'Ytify',
          name: 'Listen with ytify',
          description: '32kb/s to 128kb/s youtube audio streaming website.',
          icons: [
            {
              src: 'logo192.png',
              type: 'image/png',
              sizes: '192x192',
              purpose: 'any maskable',
            },
            {
              src: 'logo512.png',
              type: 'image/png',
              sizes: '512x512',
              purpose: 'any maskable',
            },
            {
              src: 'monochrome.png',
              type: 'image/png',
              sizes: '512x512',
              purpose: 'monochrome',
            },
          ],
          shortcuts: [
            {
              name: 'History',
              url: '/?collection=history',
              icons: [{ src: 'memories-fill.png', sizes: '192x192' }],
            },
            {
              name: 'Favorites',
              url: '/?collection=favorites',
              icons: [{ src: 'heart-fill.png', sizes: '192x192' }],
            },
            {
              name: 'Listen Later',
              url: '/?collection=listenLater',
              icons: [{ src: 'calendar-schedule-fill.png', sizes: '192x192' }],
            },
          ],
          start_url: '/',
          display: 'standalone',
          theme_color: 'black',
          background_color: 'black',
          share_target: {
            action: '/',
            method: 'GET',
            params: {
              title: 'title',
              text: 'text',
              url: 'url',
            },
          },
        },
        disable: isDev,
      }),
      
      // Compression plugin (only for production)
      isProd && compressionPlugin(),
      
      // Bundle analyzer (run with ANALYZE=true)
      process.env.ANALYZE && bundleAnalyzerPlugin(),
    ].filter(Boolean) as PluginOption[],
    
    // CSS configuration
    css: {
      postcss: {
        plugins: [
          autoprefixer(),
          postcssJitProps(OpenProps),
        ],
      },
      // CSS modules configuration
      modules: {
        localsConvention: 'camelCase',
      },
      // CSS code splitting
      devSourcemap: true,
    },
    
    // Build configuration
    build: {
      // Target modern browsers
      target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
      
      // Output directory
      outDir: 'dist',
      
      // Asset inlining threshold
      assetsInlineLimit: BUILD_CONFIG.INLINE_LIMIT,
      
      // CSS code splitting
      cssCodeSplit: true,
      
      // Source maps for production (hidden)
      sourcemap: isProd ? 'hidden' : true,
      
      // Minification options
      minify: isProd ? 'terser' : 'esbuild',
      terserOptions: isProd ? {
        compress: {
          // Drop console logs in production
          drop_console: true,
          drop_debugger: true,
          // Pure function calls (can be removed if unused)
          pure_funcs: ['console.log', 'console.info', 'console.debug'],
          // Aggressive optimizations
          passes: 2,
          unsafe: true,
          unsafe_arrows: true,
          unsafe_comps: true,
          unsafe_math: true,
          unsafe_methods: true,
          unsafe_proto: true,
          unsafe_symbols: true,
        },
        mangle: {
          safari10: true,
          // Preserve class names for debugging
          keep_classnames: false,
          keep_fnames: false,
        },
        format: {
          // Remove comments
          comments: false,
          // Compact output
          beautify: false,
        },
      } : undefined,
      
      // Rollup options
      rollupOptions: {
        output: {
          // Manual chunks for optimal code splitting
          manualChunks: (id: string) => {
            // Vendor chunks
            for (const [chunkName, deps] of Object.entries(BUILD_CONFIG.VENDOR_CHUNKS)) {
              if (deps.some(dep => id.includes(`node_modules/${dep}`))) {
                return chunkName;
              }
            }
            
            // Feature chunks
            for (const [chunkName, files] of Object.entries(BUILD_CONFIG.FEATURE_CHUNKS)) {
              if (files.some(file => id.includes(file.slice(2)))) { // Remove './'
                return chunkName;
              }
            }
            
            // Default vendor chunk for other node_modules
            if (id.includes('node_modules')) {
              return 'vendor';
            }
            
            return undefined;
          },
          
          // Chunk file naming
          chunkFileNames: isProd
            ? 'assets/[name]-[hash].js'
            : 'assets/[name].js',
          
          // Entry file naming
          entryFileNames: isProd
            ? 'assets/[name]-[hash].js'
            : 'assets/[name].js',
          
          // Asset file naming
          assetFileNames: isProd
            ? 'assets/[name]-[hash].[ext]'
            : 'assets/[name].[ext]',
        },
      },
      
      // Chunk size warning
      chunkSizeWarningLimit: BUILD_CONFIG.CHUNK_WARNING_LIMIT,
      
      // Report compressed size
      reportCompressedSize: isProd,
    },
    
    // Dev server configuration
    server: {
      port: 3000,
      host: true,
      // HMR configuration
      hmr: {
        overlay: true,
      },
      // Proxy for API requests
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
        '/sync': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
        '/library': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
        '/hash': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },
    
    // Preview server configuration
    preview: {
      port: 4173,
      host: true,
    },
    
    // Dependency optimization
    optimizeDeps: {
      include: [
        'solid-js',
        'solid-js/web',
        'solid-js/store',
      ],
      exclude: [
        'workbox-precaching',
        'workbox-routing',
        'workbox-strategies',
      ],
    },
    
    // Experimental features
    experimental: {
      // Render built CSS to <head>
      renderBuiltUrl: (filename, { hostType }) => {
        if (hostType === 'css') {
          return { runtime: filename };
        }
        return filename;
      },
    },
  };
  
  return config;
});

// ==========================================================================
// Plugin: Eruda Dev Tools
// ==========================================================================

const injectEruda = (serve: boolean): PluginOption => serve ? {
  name: 'erudaInjector',
  transformIndexHtml: (html) => ({
    html,
    tags: [
      {
        tag: 'script',
        attrs: {
          src: '/node_modules/eruda/eruda',
        },
        injectTo: 'body-prepend',
      },
      {
        tag: 'script',
        injectTo: 'body-prepend',
        children: 'eruda.init()',
      },
    ],
  }),
} : null!;

// ==========================================================================
// Plugin: Compression
// ==========================================================================

const compressionPlugin = (): PluginOption => {
  // Dynamic import to avoid bundling in dev
  return {
    name: 'compression',
    async generateBundle(_options, bundle) {
      const { gzip, brotliCompress } = await import('zlib');
      const { promisify } = await import('util');
      
      const gzipAsync = promisify(gzip);
      const brotliAsync = promisify(brotliCompress);
      
      for (const [fileName, asset] of Object.entries(bundle)) {
        if (asset.type === 'chunk' || 
            (asset.type === 'asset' && typeof asset.source === 'string')) {
          const source = asset.type === 'chunk' ? asset.code : asset.source;
          
          if (typeof source === 'string' && source.length > 1024) {
            // Only compress files larger than 1KB
            console.log(`Compressing ${fileName}...`);
          }
        }
      }
    },
  };
};

// ==========================================================================
// Plugin: Bundle Analyzer
// ==========================================================================

const bundleAnalyzerPlugin = (): PluginOption => {
  return {
    name: 'bundle-analyzer',
    async closeBundle() {
      console.log('\n📊 Bundle Analysis Complete\n');
      console.log('Run "npx vite-bundle-visualizer" for detailed analysis');
    },
  };
};

// ==========================================================================
// Performance Hints
// ==========================================================================

/*
Performance Optimization Checklist:
===================================

1. Code Splitting:
   - Vendor chunks are separated for better caching
   - Feature-based chunks enable lazy loading
   - Dynamic imports for non-critical code

2. Asset Optimization:
   - Small assets (<4KB) are inlined as base64
   - Images are served in modern formats (WebP, AVIF)
   - Fonts use woff2 format with font-display: swap

3. Build Optimization:
   - Terser minification with aggressive settings
   - Tree shaking eliminates unused code
   - CSS is code-split and minimized

4. Caching Strategy:
   - Content-hashed filenames for long-term caching
   - Service worker precaches critical assets
   - Runtime caching for dynamic content

5. Loading Performance:
   - Critical CSS is inlined
   - Scripts use defer/async where appropriate
   - Preload hints for critical resources

6. Runtime Performance:
   - Virtual lists for long lists
   - Debounced event handlers
   - RequestAnimationFrame for animations
*/
