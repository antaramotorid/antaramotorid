19:25:49.243 Running build in Washington, D.C., USA (East) – iad1
19:25:49.244 Build machine configuration: 2 cores, 8 GB
19:25:49.447 Cloning github.com/antaramotorid/antaramotorid (Branch: main, Commit: 7d2b99d)
19:25:49.697 Cloning completed: 250.000ms
19:25:50.127 Restored build cache from previous deployment (H54vNkgJmTMHoNAf95nHYmW4e6NE)
19:25:50.468 Running "vercel build"
19:25:50.852 Vercel CLI 48.9.0
19:25:51.174 Installing dependencies...
19:25:51.953 
19:25:51.955 up to date in 564ms
19:25:51.955 
19:25:51.955 3 packages are looking for funding
19:25:51.956   run `npm fund` for details
19:25:51.983 Detected Next.js version: 14.2.5
19:25:51.987 Running "npm run build"
19:25:52.091 
19:25:52.091 > antaramotorid@0.1.0 build
19:25:52.091 > next build
19:25:52.091 
19:25:52.799   ▲ Next.js 14.2.5
19:25:52.800 
19:25:52.827    Creating an optimized production build ...
19:25:53.374  ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
19:25:55.546  ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
19:25:56.420  ⚠ Found lockfile missing swc dependencies, run next locally to automatically patch
19:25:57.364  ✓ Compiled successfully
19:25:57.365    Linting and checking validity of types ...
19:25:57.674 
19:25:57.674    We detected TypeScript in your project and reconfigured your tsconfig.json file for you. Strict-mode is set to false by default.
19:25:57.674    The following suggested values were added to your tsconfig.json. These values can be changed to fit your project's needs:
19:25:57.674 
19:25:57.674    	- allowJs was set to true
19:25:57.674    	- incremental was set to true
19:25:57.674    	- include was updated to add '.next/types/**/*.ts'
19:25:57.675    	- plugins was updated to add { name: 'next' }
19:25:57.675 
19:25:57.675    The following mandatory changes were made to your tsconfig.json:
19:25:57.675 
19:25:57.675    	- esModuleInterop was set to true (requirement for SWC / babel)
19:25:57.675 
19:26:00.960 Failed to compile.
19:26:00.961 
19:26:00.962 ./app/listings/[id]/page.tsx:92:9
19:26:00.962 Type error: Type '({ type: "video"; url: string; } | { type: "image"; url: string; })[]' is not assignable to type 'MediaItem[]'.
19:26:00.963   Type '{ type: "video"; url: string; } | { type: "image"; url: string; }' is not assignable to type 'MediaItem'.
19:26:00.963     Property 'kind' is missing in type '{ type: "video"; url: string; }' but required in type 'MediaItem'.
19:26:00.963 
19:26:00.963 [0m [90m 90 |[39m[0m
19:26:00.963 [0m [90m 91 |[39m   [90m// 4) Susun media: video dulu, lalu foto  (PAKAI `type`, BUKAN `kind`)[39m[0m
19:26:00.963 [0m[31m[1m>[22m[39m[90m 92 |[39m   [36mconst[39m media[33m:[39m [33mMediaItem[39m[] [33m=[39m [[0m
19:26:00.963 [0m [90m    |[39m         [31m[1m^[22m[39m[0m
19:26:00.964 [0m [90m 93 |[39m     [33m...[39mvideoUrls[33m.[39mmap((url) [33m=>[39m ({ type[33m:[39m [32m"video"[39m [36mas[39m [36mconst[39m[33m,[39m url }))[33m,[39m[0m
19:26:00.964 [0m [90m 94 |[39m     [33m...[39mimageUrls[33m.[39mmap((url) [33m=>[39m ({ type[33m:[39m [32m"image"[39m [36mas[39m [36mconst[39m[33m,[39m url }))[33m,[39m[0m
19:26:00.964 [0m [90m 95 |[39m   ][33m;[39m[0m
19:26:01.003 Error: Command "npm run build" exited with 1
