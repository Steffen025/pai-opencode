# Changelog

All notable changes to PAI-OpenCode are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [4.0.0](https://github.com/Steffen025/pai-opencode/compare/pai-opencode-v3.0.0...pai-opencode-v4.0.0) (2026-04-13)


### ⚠ BREAKING CHANGES

* **wp-m1:** Removes the model_tiers feature and the dependency on the Steffen025/opencode fork. PAI-OpenCode now runs on vanilla OpenCode from opencode.ai. Each agent has exactly one model configured in opencode.json (no more quick/standard/advanced tier sub-blocks). The model_tier parameter is removed from Task tool invocations.
* **pai-2.5:** Renamed skills/CORE to skills/PAI

### Features

* **algorithm:** Port Algorithm v3.7.0 from upstream PAI v4.0.3 ([99462c6](https://github.com/Steffen025/pai-opencode/commit/99462c648e918f8ac51df85f91adffc1d0cba86f))
* **ci:** Add professional CI/CD workflows, CodeRabbit, and upstream sync ([61efd46](https://github.com/Steffen025/pai-opencode/commit/61efd46fb862267ac9334844cf875a2b0e629b30))
* complete work session intelligence port (Phases 2-5) ([79036ee](https://github.com/Steffen025/pai-opencode/commit/79036ee8d2ab4fa1e4a8c54c5c85df5e4f9e6db5)), closes [#24](https://github.com/Steffen025/pai-opencode/issues/24)
* **converter:** Interactive mode selection wizard ([81d3d99](https://github.com/Steffen025/pai-opencode/commit/81d3d990dc7a3fb0891c8c5b8d32cbbb38345cbc))
* **converter:** Version 1.0.0 with selective import mode ([535fc87](https://github.com/Steffen025/pai-opencode/commit/535fc87fbd3be335f91f06a098d70769aeb66012))
* **core:** v2.4 CORE + Agents Migration ([8a8af91](https://github.com/Steffen025/pai-opencode/commit/8a8af915f328fc7583454247c97dbf650a7c884e))
* **installer:** add anthropic-max preset for Max/Pro OAuth subscription ([#84](https://github.com/Steffen025/pai-opencode/issues/84)) ([b1b1f0c](https://github.com/Steffen025/pai-opencode/commit/b1b1f0c15833e7d0399ffc53b4bcd2b70a4ce612))
* **installer:** Add ZEN Provider as default option for free models ([f73e636](https://github.com/Steffen025/pai-opencode/commit/f73e636a0b66a583fd63427e062c7671a4602624))
* **installer:** hybrid Go installation with automatic fallback ([f1f5a04](https://github.com/Steffen025/pai-opencode/commit/f1f5a04671225ab1aafc34eda46771463b4f7492))
* **installer:** restore interactive terminal install wizard for v3 ([fc095cd](https://github.com/Steffen025/pai-opencode/commit/fc095cdfff0f33c80f768da92b58965854f17208))
* **installer:** restore interactive terminal wizard for v3 ([169348c](https://github.com/Steffen025/pai-opencode/commit/169348c70498b65a685d84333be4a6551851ed24))
* **install:** PAI-Install Electron GUI installer ([1ce431b](https://github.com/Steffen025/pai-opencode/commit/1ce431b05e26828a6da1619fd75d9d491f1c2bda))
* **install:** PR-01 — PAI-Install Electron GUI Installer (46 neue Dateien) ([aa1daf5](https://github.com/Steffen025/pai-opencode/commit/aa1daf507e4c6f851237bf308a2150e7e5a067da))
* **install:** Replace bash script with TypeScript Installation Wizard ([1b0aa89](https://github.com/Steffen025/pai-opencode/commit/1b0aa89825d2a1455d1cdf3d7c6e665d2bd49d22))
* migrate to PAI v3.0 / Algorithm v1.2.0 (version 2.0.0) ([41a00ca](https://github.com/Steffen025/pai-opencode/commit/41a00cac81571b4159c93315f4cabc2f84a6a522))
* **oauth:** add runtime auto-refresh token bridge ([#85](https://github.com/Steffen025/pai-opencode/issues/85)) ([43adf8d](https://github.com/Steffen025/pai-opencode/commit/43adf8d677d8fb72752735638d3ec8cd23d3edf6))
* **onboarding:** Add personalization workflow + fix install.sh provider config ([ea4a0ef](https://github.com/Steffen025/pai-opencode/commit/ea4a0ef7ff2062db48021cd32c67991e2d575588))
* **pai-2.5:** complete PAI 2.5 upgrade with ISCValidator ([f388d62](https://github.com/Steffen025/pai-opencode/commit/f388d621ef0ed3dc415e21b8b3158a7df37e2453))
* PAI-OpenCode v1.0.0 - Production Ready Release ([39d3141](https://github.com/Steffen025/pai-opencode/commit/39d314108a561dd0fbf085e2eecfa0c594f9bccf))
* **pai:** Revised WP1 - Correct PAI 4.0.3 Core Port ([5499d15](https://github.com/Steffen025/pai-opencode/commit/5499d1595f9a8075249411d8ee5925b1faabab25))
* **pai:** Revised WP1 - Correct PAI 4.0.3 Core Port ([1571f0a](https://github.com/Steffen025/pai-opencode/commit/1571f0a49c0d88e9fa583af621e6aae2f813404f))
* **pai:** separate pai command from opencode ([6f1eab3](https://github.com/Steffen025/pai-opencode/commit/6f1eab3c5e6a2703f26104b2080488997cf2236f))
* **plugins:** v1.0 Handler System - 80% PAI 2.4 Hook Coverage ([f092273](https://github.com/Steffen025/pai-opencode/commit/f0922731fff23ca9784a914f1ec2e5da5506ffe0))
* reorganize skills into Utilities/ namespace (Teil 1) ([8a4140d](https://github.com/Steffen025/pai-opencode/commit/8a4140d450cd4f8604d38209997dae7b4072e0c4))
* replace claude CLI spawn with provider-agnostic fetch in Inference.ts ([a21a707](https://github.com/Steffen025/pai-opencode/commit/a21a707177895d22c01fec18a60735f8c7bca726)), closes [#17](https://github.com/Steffen025/pai-opencode/issues/17)
* **skills:** Add 10 new PAI v2.4 skills ([671dd27](https://github.com/Steffen025/pai-opencode/commit/671dd276767c8757d97166f1ce7b1187fc96605f))
* **skills:** Add System skill from PAI 2.3 ([b634a38](https://github.com/Steffen025/pai-opencode/commit/b634a381b8017ce5a0c821e60267acb495dabe29))
* **skills:** Add v2.4 nested skill structures ([b5f779e](https://github.com/Steffen025/pai-opencode/commit/b5f779ed2d1adaf72467dbbf966daf2c143f915a))
* upstream sync Algorithm v1.2.0 → v1.8.0 (14 commits) ([9e0c9dd](https://github.com/Steffen025/pai-opencode/commit/9e0c9dd432f6292bfe349d390f1da0cfd3d71c2b))
* Utilities Teil 2 + Scraping + Content reorganization (84 files) ([d1daeab](https://github.com/Steffen025/pai-opencode/commit/d1daeabd3e3b63cd7448850c687aef6063a373b7))
* **v1.1:** add voice-server + fix documentation consistency ([a7a7509](https://github.com/Steffen025/pai-opencode/commit/a7a750917e908390512f22493eb3b4b70eee82c1))
* **v1.1:** port PAI 2.5 handlers - voice, sentiment, tabstate, counts, capture ([63b1b2f](https://github.com/Steffen025/pai-opencode/commit/63b1b2f9929026497ba42ce4c816f0585b22e5fb))
* **v1.2.1:** provider profile system + multi-provider research ([d098155](https://github.com/Steffen025/pai-opencode/commit/d098155c7e3b5024ecfd923a2c676811b333e9e1)), closes [#14](https://github.com/Steffen025/pai-opencode/issues/14)
* **v1.2:** Real-Time Observability Dashboard ([#12](https://github.com/Steffen025/pai-opencode/issues/12)) ([fa61290](https://github.com/Steffen025/pai-opencode/commit/fa612900afcf669192e8693e14142a19f2113f91))
* **v1.3.0:** Multi-Provider Agent System with model tiers and 3 presets ([f4f37ee](https://github.com/Steffen025/pai-opencode/commit/f4f37ee26a3a7928801608d03d7a38ae7e1fdece))
* **v1.3.0:** Multi-Provider Agent System with model tiers and 3 presets ([a1f7d80](https://github.com/Steffen025/pai-opencode/commit/a1f7d80be68bb518f7eca4ebe60d941b6c928277)), closes [#19](https://github.com/Steffen025/pai-opencode/issues/19)
* v2.0.0 release — hero banner, release notes, community announcement ([2579678](https://github.com/Steffen025/pai-opencode/commit/25796782b28c77d95aaded57ea9d0b80ae3c4a40))
* **wp-a:** Port missing hooks, add Bus events, audit all handlers ([8e9e45e](https://github.com/Steffen025/pai-opencode/commit/8e9e45e28e802e6cc44f32a96ec5133d22988e3a))
* **wp-a:** Port missing hooks, Bus events, complete handler audit ([5758038](https://github.com/Steffen025/pai-opencode/commit/575803889c68df971be5beaee6e4187998662ae5))
* **wp-d:** add v2→v3 migration script (Phase 3) ([1a9749c](https://github.com/Steffen025/pai-opencode/commit/1a9749cd77afb30772b56324ec948b044b2c949d))
* **wp-d:** implement DB Health tooling (WP-F integrated, Phase 4) ([e519c0d](https://github.com/Steffen025/pai-opencode/commit/e519c0de640a548ad8c217f0c2a82a4dccd79b40))
* **wp-d:** port PAI-Install from upstream v4.0.3 (Phase 2) ([c7de65c](https://github.com/Steffen025/pai-opencode/commit/c7de65c4510352969fe41fe8a31b997f4d69a8c0))
* **wp-e:** Add Electron UI flow routing for fresh/migrate/update modes ([8dcd375](https://github.com/Steffen025/pai-opencode/commit/8dcd375683bf60ca7093ffd4cd2fc90d19c9d452))
* **wp-e:** Add Google TTS support to voice configuration ([0730e16](https://github.com/Steffen025/pai-opencode/commit/0730e16da406778f3f6c1ce00da58ce2fd8e5d63))
* **wp-e:** Implement symlink-based installation architecture ([246d3ae](https://github.com/Steffen025/pai-opencode/commit/246d3aeefb4970f37613ffc4642fd16a3e6b92bf))
* **wp-e:** Installer Refactor — Electron-first architecture ([591f5d8](https://github.com/Steffen025/pai-opencode/commit/591f5d87635279dd88877af29ebfade3f0a6e23a))
* **wp-m1:** bury model_tiers, migrate to vanilla OpenCode ([f814f94](https://github.com/Steffen025/pai-opencode/commit/f814f94fb7d86eef381068fb47b08626d3c1da52))
* **wp-m1:** bury model_tiers, migrate to vanilla OpenCode (v3.0 BREAKING) ([3388c10](https://github.com/Steffen025/pai-opencode/commit/3388c103dcf27a8e6bf74fa9529386913636ad8f))
* **wp-n1:** Session Registry implementation ([aaa4124](https://github.com/Steffen025/pai-opencode/commit/aaa4124c7c101b387743568c261251a187584e76))
* **wp-n1:** Session Registry implementation ([0a30010](https://github.com/Steffen025/pai-opencode/commit/0a30010bb80c792d5cf3830832314244f65e11b6))
* **wp-n2:** Compaction Intelligence ([8381a1d](https://github.com/Steffen025/pai-opencode/commit/8381a1dd8e3577b15f9755cde6f571e95b83de54))
* **wp-n2:** Implement Compaction Intelligence with clear documentation ([604c1e9](https://github.com/Steffen025/pai-opencode/commit/604c1e927ff5f213528893fea70d0d7d25305306))
* **wp-n3:** Algorithm Awareness ([4f63037](https://github.com/Steffen025/pai-opencode/commit/4f630375f6527e4d3e24bda2fda6b8876733c62f))
* **wp-n3:** Algorithm Awareness Implementation ([f074581](https://github.com/Steffen025/pai-opencode/commit/f0745818e165fb1d05b15a8b234d6554a73fbd82))
* **wp-n4:** LSP + Fork Documentation ([5275f37](https://github.com/Steffen025/pai-opencode/commit/5275f3771000d9237b9e2a787c998359f196e98b))
* **wp-n4:** LSP + Fork Documentation ([dc39660](https://github.com/Steffen025/pai-opencode/commit/dc3966038fbe6bb65bbf300e16d89d6054611f6d))
* **wp-n5:** Plan Update — sync all docs to WP-N1..N4 complete ([a7a0065](https://github.com/Steffen025/pai-opencode/commit/a7a00653052b5ee932ca4d1409fa3e668479ac34))
* **wp-n5:** Plan Update — sync docs to WP-N1..N4 complete ([56fd00c](https://github.com/Steffen025/pai-opencode/commit/56fd00c8366feb0fa05feb16ffa3510726e1ac3b))
* **wp-n6:** System Self-Awareness — OpenCodeSystem skill, 4 arch docs, ADR-017 ([6512463](https://github.com/Steffen025/pai-opencode/commit/651246371a3701a11c01915a4d176a2ceebe0a89))
* **wp-n6:** System Self-Awareness — OpenCodeSystem skill, 4 architecture docs, ADR-017 ([5db8e44](https://github.com/Steffen025/pai-opencode/commit/5db8e44b404af7ef0f51e713370ca4aaf6e4bcfb))
* **wp-n7:** Add roborev code review + Biome CI pipeline ([a8893fd](https://github.com/Steffen025/pai-opencode/commit/a8893fdc15e13ca68dfa1ccacf41af411956cf32))
* **wp-n7:** roborev code review + Biome CI pipeline ([4cfdda6](https://github.com/Steffen025/pai-opencode/commit/4cfdda6f1e3ae4ea46ee6642ee3ed7ebbcc36051))
* **wp-n8:** Obsidian formatting guidelines + agent capability matrix ([050e632](https://github.com/Steffen025/pai-opencode/commit/050e632379111d42e87cca4d0ffd6b0873f16a77))
* **wp-n8:** Obsidian formatting guidelines + agent capability matrix ([27ab29f](https://github.com/Steffen025/pai-opencode/commit/27ab29fc56044fd256507042f2f66f4b5ee9ce71))
* **wp1:** Add OpenCode workdir documentation to Algorithm ([0aa5f33](https://github.com/Steffen025/pai-opencode/commit/0aa5f3384966535eb79eba3ba170ef2c73b0c4e9))
* **wp1:** Add OpenCode workdir documentation to Algorithm ([0b31256](https://github.com/Steffen025/pai-opencode/commit/0b312563cd028a33c2896d79b1c1f7fcc9aa6494))
* **wp2:** Context Modernization - Lazy Loading ([7fac96a](https://github.com/Steffen025/pai-opencode/commit/7fac96a473f78e74cb590cc7f14c81142ef37e81))
* **wp2:** Hybrid Algorithm loading - Essence + Lazy Load ([9bcc907](https://github.com/Steffen025/pai-opencode/commit/9bcc907e802773a50dcace2989b467a153a2df6c))
* **wp3:** Add Part B - Security, Scraping, Telos, USMetrics categories ([e39c188](https://github.com/Steffen025/pai-opencode/commit/e39c1884159e75c62fed81f5548031f5697b9f03))
* **wp3:** Add Part C - Thinking and Utilities categories (WP3 COMPLETE) ([bfc4d44](https://github.com/Steffen025/pai-opencode/commit/bfc4d44fead581bb316b41c8682537bfd62483be))
* **wp3:** Create hierarchical category structure - Part A ([8f770d7](https://github.com/Steffen025/pai-opencode/commit/8f770d70b8e54aca57d8dcfa36cb4e7d2bf262b1))
* **wp3:** Create hierarchical category structure - Part A ([d71012a](https://github.com/Steffen025/pai-opencode/commit/d71012a45a3c3caeb52c3d4fe187858a597db30b)), closes [#31](https://github.com/Steffen025/pai-opencode/issues/31)
* **wp4:** Phase 2 - Update plugin handlers for hierarchical skills ([54cca23](https://github.com/Steffen025/pai-opencode/commit/54cca23797f364d51677660efb246417d0bd3b6e))
* **wp4:** Phase 3 - Skill Discovery Enhancement ([b0ef059](https://github.com/Steffen025/pai-opencode/commit/b0ef059c4340f42c03760c6209ee2aea0b9a7c24))


### Bug Fixes

* **actions/pai:** validate --mode value before accepting local|cloud ([6a87c29](https://github.com/Steffen025/pai-opencode/commit/6a87c29c5c0c7de528b21cc3ae06c84c51c058b8))
* **actions/runner.v2:** use path.sep in isContained for Windows compat, add type checking to simplified input validation ([8511bd8](https://github.com/Steffen025/pai-opencode/commit/8511bd8aa8a0f55023dc613eeecd79b7f13d18a6))
* **actions/runner.v2:** validate output schema after execute, use Bun Shell directly for cross-platform shell cap ([d019beb](https://github.com/Steffen025/pai-opencode/commit/d019beb9789feb9ad3ebe2b21e26eb3c591f1465))
* **actions/runner:** alphabetize imports, use ctx.env for CF_ACCOUNT_SUBDOMAIN, replace glob with Bun.Glob ([3e47001](https://github.com/Steffen025/pai-opencode/commit/3e47001588b13494d653a53cf1a3455ddd58bb86))
* **actions/runner:** use fs.access() pre-check in loadAction, normalize POSIX paths in listActions ([025fa57](https://github.com/Steffen025/pai-opencode/commit/025fa57298e04a0cd274686f5c01d3da39eb814a))
* **actions:** fail fast when CF_ACCOUNT_SUBDOMAIN is missing for cloud dispatch ([f59313a](https://github.com/Steffen025/pai-opencode/commit/f59313a5d76f2e563c924af4e345795c2e99b33c))
* **actions:** switch CLI to runner.v2, fix listPipelines filter, fix info command ([e61552e](https://github.com/Steffen025/pai-opencode/commit/e61552eeb3da6853083e017dacdc7cea814d01ae))
* add missing bun install step to wizard and README Quick Start ([2fb355e](https://github.com/Steffen025/pai-opencode/commit/2fb355e32ed6d8c79acbb46d763d7da37874c899))
* add pragma allowlist secret to env var reads in Art Tools (CI secrets scanner) ([5490ad0](https://github.com/Steffen025/pai-opencode/commit/5490ad081492a38c98b294179a146db451e3f62b))
* Address all 43 CodeRabbit findings in PR [#47](https://github.com/Steffen025/pai-opencode/issues/47) ([ccc755c](https://github.com/Steffen025/pai-opencode/commit/ccc755ce574bb2031cf778181f400e5e9f657107))
* Address all CodeRabbit critical and major issues in PR [#46](https://github.com/Steffen025/pai-opencode/issues/46) ([34f428c](https://github.com/Steffen025/pai-opencode/commit/34f428c7beab362fd3d7c49e708a3aeb8646dcd3))
* Address all remaining CodeRabbit major and minor issues in PR [#46](https://github.com/Steffen025/pai-opencode/issues/46) ([b303355](https://github.com/Steffen025/pai-opencode/commit/b303355f4dc71ca2aa79732fdfcd633433eb5b2f))
* address CodeRabbit review findings for PAI-Install ([2129268](https://github.com/Steffen025/pai-opencode/commit/2129268816fa397c3e467937b33914329632314a))
* address CodeRabbit Round 1 review findings ([ed6c1b7](https://github.com/Steffen025/pai-opencode/commit/ed6c1b797005a83e94bba6996d64a6a69509c632))
* address CodeRabbit Round 2 review findings ([96f70aa](https://github.com/Steffen025/pai-opencode/commit/96f70aa4f7a34aaa36e77782231251ecb7a9cd14))
* address CodeRabbit Round 3 review findings ([c9839e8](https://github.com/Steffen025/pai-opencode/commit/c9839e88c31f44f10abcfd6baa51f73029534392))
* address CodeRabbit Round 4 verified findings ([62de050](https://github.com/Steffen025/pai-opencode/commit/62de050f7f56f073e9276949cf89ae538ac51e05))
* Address new CodeRabbit commentary (15 additional issues) ([402d0df](https://github.com/Steffen025/pai-opencode/commit/402d0df6e37520c83c8e1dc6c3391d36dc7aeaef))
* **adr-004:** replace console.* with fileLog in plugins ([946aa66](https://github.com/Steffen025/pai-opencode/commit/946aa666c37c9c231ebea50530a27ea9d0b91ad6))
* **agents:** Convert all color names to hex format ([16f309c](https://github.com/Steffen025/pai-opencode/commit/16f309c37e261adb59837cca7db8d80d519894ac))
* **agents:** Use full model ID format for OpenCode compatibility ([dad3ee5](https://github.com/Steffen025/pai-opencode/commit/dad3ee5a23dfcfb7c471687f1dcf0c87968923cc))
* **algorithm:** Address Code Rabbit review findings on PR [#32](https://github.com/Steffen025/pai-opencode/issues/32) ([fcb59a8](https://github.com/Steffen025/pai-opencode/commit/fcb59a8d5b19d2d7e124debfb2ffcdace2f7e098))
* Anthropic Max Subscription API blocking workaround ([6934c7f](https://github.com/Steffen025/pai-opencode/commit/6934c7f95df566c18409c40c692b710ff2932a51)), closes [#8](https://github.com/Steffen025/pai-opencode/issues/8)
* apply CodeRabbit auto-fixes ([c231cd5](https://github.com/Steffen025/pai-opencode/commit/c231cd571f926a6b8537e3862ca61e8d27365f11))
* apply CodeRabbit auto-fixes ([88b194c](https://github.com/Steffen025/pai-opencode/commit/88b194ca973c63f86262c992d4eecb3fc569a261))
* apply CodeRabbit auto-fixes ([ebb31ca](https://github.com/Steffen025/pai-opencode/commit/ebb31ca51a93dd4657028b58ed337548429074f2))
* apply CodeRabbit auto-fixes ([3345bca](https://github.com/Steffen025/pai-opencode/commit/3345bcaabec80fc845fb63ca39beecc2ff8e3270))
* apply CodeRabbit auto-fixes ([246fd0c](https://github.com/Steffen025/pai-opencode/commit/246fd0c56b94e0e0c9cee5ad7c5231cffd6d2532))
* **biome:** widen file includes to cover root TS/JS/JSON in addition to ACTIONS ([3c1ee64](https://github.com/Steffen025/pai-opencode/commit/3c1ee64b5184f17ee52e6a9e531aeca5fa2575e2))
* **bugbountytool:** address CodeRabbit round-2 findings ([ec120a3](https://github.com/Steffen025/pai-opencode/commit/ec120a3c990a333a62695e1d5454df218a41d351))
* **bugbountytool:** address CodeRabbit round-3 findings ([fe3c683](https://github.com/Steffen025/pai-opencode/commit/fe3c6835d5a984efce79a2c8d49b7e3808c41daf))
* **bugbountytool:** address CodeRabbit round-4 findings ([471be00](https://github.com/Steffen025/pai-opencode/commit/471be00d26062eb532c2a3cd8ac55cf357af1d31))
* **bugbountytool:** address CodeRabbit round-5 findings ([5785761](https://github.com/Steffen025/pai-opencode/commit/5785761d079c113907809480c9811cdbfed213c5))
* **ci+plugins:** fix secret scan false positives and CodeRabbit security findings ([10e1836](https://github.com/Steffen025/pai-opencode/commit/10e183653a9a78a09e6bb237dddc75a2bcf6e995))
* **ci+plugins:** round-3 CodeRabbit fixes ([bbbf9f1](https://github.com/Steffen025/pai-opencode/commit/bbbf9f1cf2c5242f41f99abe769228bcffe1ad3b))
* **ci:** add .github to secret scan dirs, fix find not pruning node_modules ([423308e](https://github.com/Steffen025/pai-opencode/commit/423308e2e72e48be6a613338a2e7ba25b8829161))
* **ci:** add biome.json config scoped to ACTIONS TypeScript code ([adddb5d](https://github.com/Steffen025/pai-opencode/commit/adddb5dd09ef5a071e2cb190e4cb8b28e7fab960))
* **ci:** add lint script to root package.json for Biome check ([647fa69](https://github.com/Steffen025/pai-opencode/commit/647fa69a119d9b0aec530807085e1b84e7848318))
* **ci:** Additional Code Rabbit review fixes ([8c40683](https://github.com/Steffen025/pai-opencode/commit/8c4068333451acb1bfdf4acf26b22bfecce91805))
* **ci:** apply StepSecurity hardening (PR [#106](https://github.com/Steffen025/pai-opencode/issues/106)) + coderabbit corrections ([ab12ccd](https://github.com/Steffen025/pai-opencode/commit/ab12ccda5eebd2d616aefe9b9865edd822022605))
* **ci:** coderabbit round 2 + add release-please for v3.0 automated releases ([ac6bceb](https://github.com/Steffen025/pai-opencode/commit/ac6bceb202ff7292a4b2b30b93e043d4e731019f))
* **ci:** correct biome.json schema for v1.x (fix unknown keys) ([683b345](https://github.com/Steffen025/pai-opencode/commit/683b345368fa8b90b433557a935a5215dc76df2c))
* **ci:** disable biome assist (organizeImports) to avoid sort errors ([ee37d2f](https://github.com/Steffen025/pai-opencode/commit/ee37d2fb7dd04e05e7416a7c1b40a93acd2014b3))
* **ci:** disable biome formatter check (lint only, no format enforcement) ([1561eab](https://github.com/Steffen025/pai-opencode/commit/1561eabecae9704ca31878747c0816ae3b29b341))
* **ci:** disable organizeImports in biome.json ([267937e](https://github.com/Steffen025/pai-opencode/commit/267937efd544b60c8039eb70e1a7b74a882e2cea))
* **ci:** Exclude BountyPrograms.json from secret scan ([3c07ce8](https://github.com/Steffen025/pai-opencode/commit/3c07ce818e42118e86b1e866f62ce8c557f993d9))
* **ci:** Exclude node_modules from secret scanning ([c145ef1](https://github.com/Steffen025/pai-opencode/commit/c145ef1b48fcb39e15012183cae30718cd66c0a2))
* **ci:** Final Code Rabbit review fixes ([2da83d5](https://github.com/Steffen025/pai-opencode/commit/2da83d508f5214acc795289e73fe51865eb2c356))
* **ci:** Improve secret scan with debug output ([a307472](https://github.com/Steffen025/pai-opencode/commit/a307472f7890f666d86da8830e15370b2c965e2a))
* **ci:** remove organizeImports (unknown key in installed Biome version) ([152c450](https://github.com/Steffen025/pai-opencode/commit/152c450352776c1d3995bdba494de5b73a188d02))
* **ci:** StepSecurity hardening + CodeRabbit corrections (supersedes [#106](https://github.com/Steffen025/pai-opencode/issues/106)) ([f15c2d6](https://github.com/Steffen025/pai-opencode/commit/f15c2d6967bc2c5499727244c9d4fb1821e07af1))
* **ci:** update bun.lock to match package.json — remove stale zod and biome entries ([f83d9dc](https://github.com/Steffen025/pai-opencode/commit/f83d9dc225783bd8bdf56fe37e075913c4b2e536))
* **cli:** FeatureRegistry handle flags correctly in update ([785fefa](https://github.com/Steffen025/pai-opencode/commit/785fefa7b26e417eb0495baa301d4af432e6da5b))
* CodeRabbit round-1 — wrong paths, spring shadowing, frames doc, fontSize, import casing ([dddf58a](https://github.com/Steffen025/pai-opencode/commit/dddf58a015eb98115d8c8edf74346ceb2f7cec94))
* CodeRabbit round-2 — arg bounds checks, NaN guards, path fixes, Remotion delay API ([85e8bf8](https://github.com/Steffen025/pai-opencode/commit/85e8bf878e53d7c6354a4859ea67976b992328d6))
* CodeRabbit round-2 + CI secrets scanner false positives ([d241112](https://github.com/Steffen025/pai-opencode/commit/d2411121b0846eb7d17108ee33ed04061701065c))
* CodeRabbit round-3 — 13 bugs across BannerMatrix/FailureCapture/YouTubeApi/Analyze/ExtractTranscript ([e757cb7](https://github.com/Steffen025/pai-opencode/commit/e757cb747d164c827c8fbbf2e7a3d87ce9750a44))
* CodeRabbit round-3 — TIMESTAMP consistency + MD040 fences in AdHocYouTubeThumbnail ([083349c](https://github.com/Steffen025/pai-opencode/commit/083349c2acb26d8c110c3279b8623a3ac7dbdfdd))
* CodeRabbit round-4 — 8 bugs across ExtractTranscript/FailureCapture/YouTubeApi/Analyze ([45637ee](https://github.com/Steffen025/pai-opencode/commit/45637eead8d9425190c5ad8f42cda1da89afe833))
* CodeRabbit round-4 — normalize {timestamp} to ${TIMESTAMP} on line 342 ([10d325b](https://github.com/Steffen025/pai-opencode/commit/10d325b51650c87b06d1ccb18905c8109cd4ff0e))
* CodeRabbit round-5 — timeout, strict int, arg parse, clearTimeout finally, 8-word strict ([839ef2e](https://github.com/Steffen025/pai-opencode/commit/839ef2ee97c53fd0d7c2972fa604e7c23ce3db56))
* complete work session intelligence port ([81d7d93](https://github.com/Steffen025/pai-opencode/commit/81d7d933238e113ea9e0588214b5cbaf52a0aa6c))
* **config:** Change 'plugins' to 'plugin' (correct schema key) ([4fad315](https://github.com/Steffen025/pai-opencode/commit/4fad31548aae3abfcc00d9cbb8fe0212e25c66b2))
* **config:** Remove plugin array - use auto-discovery instead ([90bb6a2](https://github.com/Steffen025/pai-opencode/commit/90bb6a2722129dc7d0471753a7d13ce3327f3a7a))
* **core:** OpenCode-native architecture — zero bootstrap, Zen free default ([d5421a2](https://github.com/Steffen025/pai-opencode/commit/d5421a269cd8543505bebd2b9ceafd1941475cb4))
* **core:** OpenCode-native architecture — zero bootstrap, Zen free default ([406dac2](https://github.com/Steffen025/pai-opencode/commit/406dac2ef8bf63f38b1a70cf5341183cf71adb12))
* correct explore agent type case-sensitivity and update agent mapping ([1a3823a](https://github.com/Steffen025/pai-opencode/commit/1a3823a5e024697fdf23f5e513ab3b636c6bb540))
* crash fixes, wizard build-from-source rewrite, simplified versioning (v1.3.1) ([5c0ff65](https://github.com/Steffen025/pai-opencode/commit/5c0ff652d02d642158411913e3368c16dfe664a8)), closes [#21](https://github.com/Steffen025/pai-opencode/issues/21)
* **defaults:** ship with big-pickle only + clarify two-step provider setup ([428275c](https://github.com/Steffen025/pai-opencode/commit/428275c3fc5cd303a0d6136f648b77e7009c93db))
* **deps:** add ajv to .opencode/package.json for action schema validation ([d0dab5e](https://github.com/Steffen025/pai-opencode/commit/d0dab5ec28c940953f0763153cf91c69b54db1e7))
* **docs:** address CodeRabbit round-2 findings — callouts, file count, Mermaid ([f429a69](https://github.com/Steffen025/pai-opencode/commit/f429a69fd4472d15d5e2ea2b8c70a312706a6cae))
* **docs:** address CodeRabbit round-3 — correct PR-12 count to 18, fix diagram branch, add sed portability, MD028, Mermaid diagram ([e484aae](https://github.com/Steffen025/pai-opencode/commit/e484aaeec3523026b061577a31d47d8f5b54a5ac))
* **docs:** align changelog and installer CLI flags ([db20343](https://github.com/Steffen025/pai-opencode/commit/db2034300a47b8bc53565991ace9d8ec9a151811))
* **docs:** correct THEHOOKSYSTEM/THEPLUGINSYSTEM reality in all planning docs ([cba9e0f](https://github.com/Steffen025/pai-opencode/commit/cba9e0fde1fdb8ba5e031d5926bd1e317877de52))
* **docs:** fix remaining stale +16 → +17 in statistics tables ([b23711e](https://github.com/Steffen025/pai-opencode/commit/b23711ee4d929e0aa8bc92498f377dcfe8bb9ff2))
* **docs:** update GitPush.md remote references from .claude to .opencode ([9293b34](https://github.com/Steffen025/pai-opencode/commit/9293b34fb5b20f2055ae7f68042946fdeaa743f5))
* enable websearch, codesearch, webfetch built-in tools ([756a38c](https://github.com/Steffen025/pai-opencode/commit/756a38c14104b62b778956056fc291b510dbe475)), closes [#9](https://github.com/Steffen025/pai-opencode/issues/9)
* exclude skill Tools directories from bundle ([ddb2875](https://github.com/Steffen025/pai-opencode/commit/ddb287576def88c87a769a47715dc124713f4135))
* **fabric:** correct typos in ask_uncle_duke/system.md ([9714f22](https://github.com/Steffen025/pai-opencode/commit/9714f2209741e4ca005fafb0c9524da25df2d732))
* filter trivial messages from creating empty work sessions ([17fb4b0](https://github.com/Steffen025/pai-opencode/commit/17fb4b0ef511aa6d61fc230fae1791fcbaa2beb3)), closes [#24](https://github.com/Steffen025/pai-opencode/issues/24)
* **installer:** add Homebrew permission error handling ([f76f3c7](https://github.com/Steffen025/pai-opencode/commit/f76f3c7079f430daf65e400a95b0547deecc1b57))
* **installer:** address CodeRabbit review findings ([bc367f8](https://github.com/Steffen025/pai-opencode/commit/bc367f83fa15d4a5832b70696f2bddfe9ad45ae1))
* **installer:** address CodeRabbit round-2 findings ([2aea3e7](https://github.com/Steffen025/pai-opencode/commit/2aea3e73d0a69f132ec693c0397a9e80f3f5e5bc))
* **installer:** address CodeRabbit round-3 findings ([3ac8640](https://github.com/Steffen025/pai-opencode/commit/3ac8640ae9c1433c9f1fb77d83328b82f561693a))
* **installer:** address CodeRabbit round-4 findings ([bb99d64](https://github.com/Steffen025/pai-opencode/commit/bb99d64364c7e3e45536dc7543f36d3e6bda4a82))
* **installer:** address CodeRabbit round-5 findings ([fde092c](https://github.com/Steffen025/pai-opencode/commit/fde092c85fd275abf702f3738665355a18738a34))
* **installer:** avoid self-symlinking and stop reconnects after completion ([ce7cd64](https://github.com/Steffen025/pai-opencode/commit/ce7cd646431d76ef83cba7375a3cb9bbae23b79f))
* **installer:** create required dirs, shell alias, and correct settings schema ([ae8b0aa](https://github.com/Steffen025/pai-opencode/commit/ae8b0aa86beb216ed1c26788ab952a0465790bc1))
* **installer:** create required dirs, shell alias, and correct settings schema ([cfdabba](https://github.com/Steffen025/pai-opencode/commit/cfdabba0e7a7f4dd222cbd93949234ba7d1950f4))
* **installer:** enforce mode exclusivity and align wizard fallback behavior ([c15d23c](https://github.com/Steffen025/pai-opencode/commit/c15d23c3cec84aee05503369c9837eab72282e18))
* **installer:** fix input prompts when piped + verify logo patch ([daa5242](https://github.com/Steffen025/pai-opencode/commit/daa52421d12b0268503b91632d7871e080120bd3))
* **installer:** handle SIGINT prompt cleanup and clarify mode flag errors ([5a6c58a](https://github.com/Steffen025/pai-opencode/commit/5a6c58ab065e201d118e744a62650ae922d6c7c4))
* **installer:** harden shell wiring and opencode launcher resolution ([52a8a90](https://github.com/Steffen025/pai-opencode/commit/52a8a902add60cbad386e43f7b6de0e91943b70b))
* **installer:** harden validation and reconnect handling ([4dadb14](https://github.com/Steffen025/pai-opencode/commit/4dadb149f50911140e03cd6faab4e3cee7534ce1))
* **installer:** harden wizard prompts and dry-run migration flow ([39aa3d2](https://github.com/Steffen025/pai-opencode/commit/39aa3d24a258befe66bc8c27857bd829596932df))
* **installer:** install .opencode runtime dependencies on fresh/migrate ([372a751](https://github.com/Steffen025/pai-opencode/commit/372a751c1586fa21eb8cfde8dd22a29e7c3c8e98))
* **installer:** install runtime deps for .opencode tooling ([a0b389e](https://github.com/Steffen025/pai-opencode/commit/a0b389e7d5210ad108d393029ee381070aed7b88))
* **installer:** make pai/opencode work on fresh machines ([fbcc2f1](https://github.com/Steffen025/pai-opencode/commit/fbcc2f1f5f1b65406527d839954a102475fce701))
* **installer:** prerequisites display, build hang, validation step, spinner cleanup ([f4ab414](https://github.com/Steffen025/pai-opencode/commit/f4ab414df2a7d2d91f6cee33da5be027dfda5d1b))
* **installer:** prevent broken pai alias and missing opencode ([1513ac4](https://github.com/Steffen025/pai-opencode/commit/1513ac49ea22d7b198bd1388d9d04821f76bf9d8))
* **installer:** remove stale pai alias and validate opencode ([fbc5c60](https://github.com/Steffen025/pai-opencode/commit/fbc5c601c40b7aa90bbac7fa793a09c00553f0fa))
* **installer:** replace stale ~/.opencode links and mute post-install disconnect banner ([6ffdcc6](https://github.com/Steffen025/pai-opencode/commit/6ffdcc69fbc4b23108818344889919a19b3f31c6))
* **installer:** responsive banner + Go PATH detection ([9085d63](https://github.com/Steffen025/pai-opencode/commit/9085d63bd7ebf85c272e30c583c43263154733d5))
* **installer:** write fish-compatible pai function ([f05ddeb](https://github.com/Steffen025/pai-opencode/commit/f05ddeb78c3286d7c3e65cb099817eef8d12a44f))
* **issue-28:** extractTextContent handles message.parts and output.parts ([e5785c4](https://github.com/Steffen025/pai-opencode/commit/e5785c4c767038f3bffd504199888b1ed724fbe0)), closes [#28](https://github.com/Steffen025/pai-opencode/issues/28)
* **lint:** node: imports, no-non-null-assertion, useTemplate in runner.v2.ts ([ee65fa6](https://github.com/Steffen025/pai-opencode/commit/ee65fa61b4541914a6a47ebd2da39e26e5add413))
* **lint:** node: imports, remove unused readFile, fix switch fallthrough in pai.ts ([972f446](https://github.com/Steffen025/pai-opencode/commit/972f4461ba98a693dca237e668a6740fcd5d3542))
* **lint:** remove useless continue at end of for loop body (pai.ts:71) ([0182569](https://github.com/Steffen025/pai-opencode/commit/0182569b1cfe0e186c084508b1ff12b0affc19c8))
* **lint:** use node: import protocol in pipeline-runner.ts ([2a1d8c9](https://github.com/Steffen025/pai-opencode/commit/2a1d8c93fdde60e6a860a06172fd10215129baa5))
* **lint:** use node: import protocol in runner.ts ([7dd67a3](https://github.com/Steffen025/pai-opencode/commit/7dd67a329a96b66b7ce8da38f34aa25cb1b472e4))
* **model-config:** Auto-detect provider from opencode.json model field ([d8c029b](https://github.com/Steffen025/pai-opencode/commit/d8c029bb4e977e06b7fdb184d8efc9320be4abf6))
* **oauth:** silent token refresh — no browser popup ([#88](https://github.com/Steffen025/pai-opencode/issues/88)) ([86d1d6f](https://github.com/Steffen025/pai-opencode/commit/86d1d6f2ecc3f6ddb39ffaccd5ebddc3a5b8d68f))
* **oauth:** sync full token-bridge with OAuth2 refresh strategy to .opencode and contrib ([#89](https://github.com/Steffen025/pai-opencode/issues/89)) ([9f9c93d](https://github.com/Steffen025/pai-opencode/commit/9f9c93d5ec0363305cbbde321c61918c21821c0c))
* **pai:** coderabbit review — gitignore, cmdPrompt env, explicit PAI_ENABLED check ([9f789f5](https://github.com/Steffen025/pai-opencode/commit/9f789f5a9aae30448273817645e218bf84a892bd))
* **plugins:** CodeRabbit round-2 — error handling, shell safety, DB consistency ([6caf7cf](https://github.com/Steffen025/pai-opencode/commit/6caf7cf8916f03df4b2993ee8d1783414be71cd2))
* **plugins:** round-4 inline CodeRabbit fixes ([63296ba](https://github.com/Steffen025/pai-opencode/commit/63296ba1dbabd9374a7e8e9a60379de4d72211b7))
* **plugins:** round-5 CodeRabbit hardening ([c8a8bae](https://github.com/Steffen025/pai-opencode/commit/c8a8bae8641f53e1fc7afaab49cd2ffbefde6c70))
* **plugin:** use ESM import.meta.url instead of __filename ([aeac334](https://github.com/Steffen025/pai-opencode/commit/aeac3349e6cfa5fabbdacfd9907499adef1c49ce))
* **pr07:** address CodeRabbit Round 1 security findings ([a150931](https://github.com/Steffen025/pai-opencode/commit/a150931bd1c0f34a6de3a4b7b4005b19c7075b53))
* **pr07:** address CodeRabbit Round 2 findings ([ae8a56b](https://github.com/Steffen025/pai-opencode/commit/ae8a56b7072677906f271f6900178fa52bc08042))
* **pr07:** address CodeRabbit Round 3 findings ([9dcd7d5](https://github.com/Steffen025/pai-opencode/commit/9dcd7d5388fa33180fc0453f431936849594df5c))
* **pr07:** address CodeRabbit Round 4 findings ([0e8dee8](https://github.com/Steffen025/pai-opencode/commit/0e8dee8e631050303a40a1b860e890b68e7971b6))
* **pr08:** address CodeRabbit Round 1 findings ([cc38afd](https://github.com/Steffen025/pai-opencode/commit/cc38afd5bc5a588fe0a0696d7d57448d724047a5))
* **pr08:** address CodeRabbit Round 2 findings ([65d6953](https://github.com/Steffen025/pai-opencode/commit/65d69536cc606a49ca80533f8a08b11b2bb58cd0))
* **pr08:** address CodeRabbit Round 3 findings ([2840fd2](https://github.com/Steffen025/pai-opencode/commit/2840fd24c89a49bc99bdcc9fa8dd444dfdcddd94))
* **pr08:** address CodeRabbit Round 4 findings ([96e23ba](https://github.com/Steffen025/pai-opencode/commit/96e23baaba8113b7cb10f086f9847014d03ef0be))
* **pr08:** address CodeRabbit Round 5 findings ([c416abd](https://github.com/Steffen025/pai-opencode/commit/c416abd6b6a6874fb95d39768f66314916abf327))
* **prereq:** flatten Telos and USMetrics nested directories (C.1) ([502455c](https://github.com/Steffen025/pai-opencode/commit/502455cfbe97a9a671e5e43b4617a1bf6134444e))
* prevent CLI tools from executing on bundle import ([003fda7](https://github.com/Steffen025/pai-opencode/commit/003fda7857f1f3b68229959f55cf27dcc0dc44d3))
* **quality:** Code Rabbit batch 4 - Core fixes ([da804ea](https://github.com/Steffen025/pai-opencode/commit/da804eafed7cde72b37770d7e2edb5fcb1f9a6a2))
* **quality:** Code Rabbit minor fixes batch 3 ([4fd8668](https://github.com/Steffen025/pai-opencode/commit/4fd8668bec136420e12eddcf5f027554411c0f20))
* **quality:** Final Code Rabbit fixes batch 6 ([cccc92c](https://github.com/Steffen025/pai-opencode/commit/cccc92c2fbad39b15e1c323f77f96a19259e162e))
* **rating:** Fix chat.message payload extraction + MEMORY structure ([f6b577e](https://github.com/Steffen025/pai-opencode/commit/f6b577e2bfc5ab6351599106d6f3ef7a3222ec9c)), closes [#6](https://github.com/Steffen025/pai-opencode/issues/6)
* Remove duplicate Fabric patterns + add PAI-to-OpenCode mapping guide ([43473b1](https://github.com/Steffen025/pai-opencode/commit/43473b11f77de2a278ae267befd6e8e65eff075c))
* remove incorrect voice curl template variable limitation ([1181619](https://github.com/Steffen025/pai-opencode/commit/11816196e3942f8f244e79877acaef40d91dd519))
* remove nested duplicate folder structures, add Cost-Aware Research system ([595b09e](https://github.com/Steffen025/pai-opencode/commit/595b09ec7f093f76a4be65c1d9c0b0f78e9e4c1b))
* resolve 7 wizard issues from clean-user testing ([1774245](https://github.com/Steffen025/pai-opencode/commit/17742454d2f99396fe1ccf2964426d8148c85cdc))
* resolve all 8 PR [#64](https://github.com/Steffen025/pai-opencode/issues/64) bugs in PAI Tools ([e315c1e](https://github.com/Steffen025/pai-opencode/commit/e315c1e1efc822cac5634832703f149ce5a7bdd2))
* restore correct v1.2 hero banner (not the v1.0 or v1.3.0 version) ([ad861ad](https://github.com/Steffen025/pai-opencode/commit/ad861adbd92c412d0a354f6dc6cc49e8c0f0f4e2))
* restore hex color codes in all agent markdown frontmatter ([#80](https://github.com/Steffen025/pai-opencode/issues/80)) ([f47ad43](https://github.com/Steffen025/pai-opencode/commit/f47ad43d934ae24e0dcf9c08722950cc5dd82d42))
* restore original hero banner (v1.3.0 release image was only for release asset) ([1273559](https://github.com/Steffen025/pai-opencode/commit/1273559e6ba59f7c5d20ae3a170cdcd8739cec39))
* **review:** add explicit shell setup end marker in steps-fresh ([9c30fdf](https://github.com/Steffen025/pai-opencode/commit/9c30fdf1201a016f07eec49c1b286f09d6919c5e))
* **review:** address all CodeRabbit findings + resolve merge conflict ([abd1410](https://github.com/Steffen025/pai-opencode/commit/abd141028f5884601158c6a6110a211b8ee16bcd))
* **review:** Address CodeRabbit findings — verify-then-fix pass ([f90f29f](https://github.com/Steffen025/pai-opencode/commit/f90f29f67652a87212875e2e435e5b52f448ef1e))
* **review:** address CodeRabbit PR [#138](https://github.com/Steffen025/pai-opencode/issues/138) commentary ([43a25af](https://github.com/Steffen025/pai-opencode/commit/43a25afb28e23650f257325443e18fa5c873aa24))
* **review:** address CodeRabbit round 2 commentary ([e33f7c8](https://github.com/Steffen025/pai-opencode/commit/e33f7c8267f2eda426d4da9a61232b26bd173610))
* **review:** address CodeRabbit round 3 commentary ([ba1f4b1](https://github.com/Steffen025/pai-opencode/commit/ba1f4b13af03fd00e552724be49805497a3e0da4))
* **review:** address CodeRabbit round 4 commentary ([73be561](https://github.com/Steffen025/pai-opencode/commit/73be561ae8944db4d6fc5e7f187a1ca6cd7921a2))
* **review:** align launcher order and fish shell wiring ([e660b74](https://github.com/Steffen025/pai-opencode/commit/e660b74e38175faf737bf2273f31fa108a62fb00))
* **review:** apply targeted path and tooling consistency updates ([bde2084](https://github.com/Steffen025/pai-opencode/commit/bde2084d85a5ff1cb4f1d461a1c2ca37471e7b8d))
* **review:** correct parser workflow paths and migrate shell markers ([e65cc7a](https://github.com/Steffen025/pai-opencode/commit/e65cc7ac28aed6af93c888e26be20076d0362b6e))
* **review:** recurse hook counting and ensure state dir exists ([fd7bfef](https://github.com/Steffen025/pai-opencode/commit/fd7bfef5dd79b99ef07ff317f0379d39caebdaa1))
* **review:** tighten executable checks and shell block safety ([0996f10](https://github.com/Steffen025/pai-opencode/commit/0996f10b7f38a20d20397146cd92bbde01df1f8b))
* **runtime:** align OpenCode paths and post-install defaults ([f0a0523](https://github.com/Steffen025/pai-opencode/commit/f0a0523272be77f15a58efe3f9deb159d1514160))
* **security:** Address Code Rabbit critical findings ([8eeef6f](https://github.com/Steffen025/pai-opencode/commit/8eeef6f4b2bbc597f9507d99a4fdbc0945919c43))
* **security:** ADR-009 + CodeRabbit critical fixes ([f9c16a2](https://github.com/Steffen025/pai-opencode/commit/f9c16a2a46c3527b7b9d97be9547fc7634c3fc96))
* **security:** Critical Code Rabbit fixes batch 1 ([102485c](https://github.com/Steffen025/pai-opencode/commit/102485c18ed1e8012bf55b639d5312a051759a35))
* **security:** Path Traversal fixes batch 2 ([c5f45b0](https://github.com/Steffen025/pai-opencode/commit/c5f45b04b206f5ec0c87379831fd9ceef9d20b25))
* **security:** prevent path traversal in findAction + reject cloud mode explicitly ([666886d](https://github.com/Steffen025/pai-opencode/commit/666886dd6812d303e3724bc1b413d0c7a790bfc8))
* **shell.env:** document two-layer env system, add explicit key passthrough ([09b80e1](https://github.com/Steffen025/pai-opencode/commit/09b80e14dc5f3be2e847a75ac7966546cea1ceae))
* **skills:** address CodeRabbit findings in PR-05 Fabric patterns ([783d54b](https://github.com/Steffen025/pai-opencode/commit/783d54b5b724b73a1a5873593cd13db218909163))
* **skills:** address second CodeRabbit review round for PR-05 ([97c6754](https://github.com/Steffen025/pai-opencode/commit/97c675484aabbd49d1cfae21231bdcc5bc0783a8))
* **skills:** Fix YAML frontmatter parsing errors for OpenCode ([2e6ae7c](https://github.com/Steffen025/pai-opencode/commit/2e6ae7c5c0ee7fc19e07764eb40532c927cccd90))
* **skills:** resolve duplicate skill names and PAI frontmatter ([98f6253](https://github.com/Steffen025/pai-opencode/commit/98f62532fb5b838491c2a4d5754a8d2d7a8e2deb))
* stop processing message.part.updated for user message handling ([308a004](https://github.com/Steffen025/pai-opencode/commit/308a004a7f855af81e612f1eda64f67ef5ff6889)), closes [#17](https://github.com/Steffen025/pai-opencode/issues/17)
* **structure:** move AudioEditor to top-level skills ([656f029](https://github.com/Steffen025/pai-opencode/commit/656f029ad1840a15a10795321f454cc62fbceeed))
* **structure:** move Xlsx, Pdf, Docx, Pptx to Utilities/ level ([914e45e](https://github.com/Steffen025/pai-opencode/commit/914e45e2f829488cb801fa334e6b939603153409))
* **System:** Adapt System workflows for OpenCode architecture ([25b252c](https://github.com/Steffen025/pai-opencode/commit/25b252cbab5facd4ea449eac0eafb0b4d20acca8))
* **tracker:** add missing total_checked field to DiscoveryResult return ([c730be7](https://github.com/Steffen025/pai-opencode/commit/c730be77006389636be62c8ee54c06bfd2771081))
* v1.0 Audit Remediation - 6 Critical + 3 Medium fixes ([7335a76](https://github.com/Steffen025/pai-opencode/commit/7335a76e6d1caebcaba567ea8bb275b7e644d682))
* v1.0 Final Polish - 3 MUSS fixes + 3 Docs clarifications ([d2b3732](https://github.com/Steffen025/pai-opencode/commit/d2b37323f3c46d5174470ce428e327061ff7461b))
* v1.0 Polish - Complete audit remediation for public release ([5d723ba](https://github.com/Steffen025/pai-opencode/commit/5d723ba522ffa3c619bb92c6a21f3ea4fd06233e))
* wizard build process — fix execCommand null-trim bug, remove Go prerequisite, update docs ([23d2435](https://github.com/Steffen025/pai-opencode/commit/23d2435c18e94de82c1b378895322a44bc303d94))
* wizard PATH detection — verify binary directly, auto-fix missing PATH entry ([3612a73](https://github.com/Steffen025/pai-opencode/commit/3612a734625af38776410969683603ed35837a6b))
* **wizard:** Remove unrecognized 'pai' key from opencode.json + add 6 more providers ([e6b7793](https://github.com/Steffen025/pai-opencode/commit/e6b7793e7670cc37e6b55d339acdaf7ec0afb318))
* **wizard:** Show OAuth/subscription option for Anthropic and OpenAI ([d91276c](https://github.com/Steffen025/pai-opencode/commit/d91276c0aaa4efe5a1ee0061dccc0333023a7338))
* **workflow:** Update fork repo name for upstream sync ([99fe3da](https://github.com/Steffen025/pai-opencode/commit/99fe3da2f43fe2b7189a4b09a3874c2fcbc071f9))
* **wp-a:** fix 3 CodeRabbit bugs, add shell.env hook, add OpenCode research ([c9cff5f](https://github.com/Steffen025/pai-opencode/commit/c9cff5f28c28ceb0d3de5f577ba989512a13d8e7))
* **wp-c:** address all CodeRabbit feedback items ([a99d376](https://github.com/Steffen025/pai-opencode/commit/a99d3765fb6fae3d59a9206c123d6f0a099fe5da))
* **wp-d:** address all CodeRabbit PR review findings ([262a55b](https://github.com/Steffen025/pai-opencode/commit/262a55b122e744c82f145f581fa7a54eb577d087))
* **wp-e:** Address CodeRabbit findings - import fixes, type corrections, implementation completion ([328f961](https://github.com/Steffen025/pai-opencode/commit/328f961559c0c5a98b583fd139f9e155b018fdd8))
* **wp-e:** Address CodeRabbit security and type issues ([c265498](https://github.com/Steffen025/pai-opencode/commit/c26549865ec2f29e3f8bb3d63f94600ac6949922))
* **wp-e:** Address second round of CodeRabbit findings ([84674d2](https://github.com/Steffen025/pai-opencode/commit/84674d2ea6fc89e3cb516f6270a98e242c56670a))
* **wp-e:** Address third round of CodeRabbit findings ([1f01732](https://github.com/Steffen025/pai-opencode/commit/1f01732e3c141551428f6acf22e250146e71f8df))
* **wp-e:** Implement stepInstallPAI - replace placeholder with actual installation logic ([7e962ad](https://github.com/Steffen025/pai-opencode/commit/7e962ad0757372eea91789fe9c6bbacd255e668d))
* **wp-m1:** address coderabbit review feedback on PR [#107](https://github.com/Steffen025/pai-opencode/issues/107) ([78f8dde](https://github.com/Steffen025/pai-opencode/commit/78f8dde0869b336b4629f402bbd6e76e5fa6c3f5))
* **wp-m1:** coderabbit round 2 + integrate PR [#103](https://github.com/Steffen025/pai-opencode/issues/103) model updates (credit [@ktneely](https://github.com/ktneely)) ([55adca0](https://github.com/Steffen025/pai-opencode/commit/55adca0774fef41cd89eda1eb2a8f4af32012d65))
* **wp-m1:** coderabbit round 3 — local provider, agent merging, legacy model derivation ([e6ccbc0](https://github.com/Steffen025/pai-opencode/commit/e6ccbc0c0b1c61105e88ef3d1400f308301a1473))
* **wp-n1:** Address review findings ([83830c9](https://github.com/Steffen025/pai-opencode/commit/83830c9eb34459c2161d3d7c57e4b8538fe090fc))
* **wp-n1:** Implement compare-and-swap for race condition ([e9b9563](https://github.com/Steffen025/pai-opencode/commit/e9b9563736fa5987e8cfc62d030b700b375f6dd4))
* **wp-n2:** Address CodeRabbit review findings - session isolation ([68cfb0a](https://github.com/Steffen025/pai-opencode/commit/68cfb0aef158a7f2217046f28aa3265c4b8e3cfd))
* **wp-n3:** Address CodeRabbit review findings - PRD schema & recovery docs ([5c28f97](https://github.com/Steffen025/pai-opencode/commit/5c28f97fdd83ea148fbd0acc4009571d46ef2c5e))
* **wp-n3:** Address CodeRabbit review findings - schema completeness ([ca0f3fb](https://github.com/Steffen025/pai-opencode/commit/ca0f3fb4fbe7f44b332701eb12c4f925714429f6))
* **wp-n3:** Canonical field consistency and secure fallback ([fd20c17](https://github.com/Steffen025/pai-opencode/commit/fd20c17401465d60d05f5f152f5ca6acacdedc4f))
* **wp-n3:** Correct field count and clarify PRE-OBSERVE recovery rules ([7be3d1a](https://github.com/Steffen025/pai-opencode/commit/7be3d1a7449b0ea4434a90b1df628db237361a8c))
* **wp-n4:** Address CodeRabbit review findings ([370598f](https://github.com/Steffen025/pai-opencode/commit/370598f89596b84c28103455cff0b0b54aa250e7))
* **wp-n4:** Sync TODO-v3.0.md status consistency ([5086ad5](https://github.com/Steffen025/pai-opencode/commit/5086ad5c855edc61a512536a7e23a4d60cd47139))
* **wp-n5:** Address CodeRabbit findings — checkbox, WP-E status, intro text ([b6dbba9](https://github.com/Steffen025/pai-opencode/commit/b6dbba93f47c411d0d3529fdf2a0f239a924676c))
* **wp-n5:** Progress bar 100% and section header Complete — all 4 tasks done ([4ff842f](https://github.com/Steffen025/pai-opencode/commit/4ff842f163ed543da7bfb74826f3500e5d6da252))
* **wp-n6:** Add Quick Triage ASCII+Mermaid and non-interactive Still Stuck escalation ([e9bf80b](https://github.com/Steffen025/pai-opencode/commit/e9bf80b1fa79d2c606bc45a2565f94212f79c797))
* **wp-n6:** Add text language identifier to all fenced checklist blocks ([3ec6a28](https://github.com/Steffen025/pai-opencode/commit/3ec6a28ad314956fcd0c693b89770bff1873130b))
* **wp-n6:** Address CodeRabbit round-2 findings ([95db445](https://github.com/Steffen025/pai-opencode/commit/95db445b90ca8d93b8e987653e923f0a5cf22b9e))
* **wp-n6:** Address feedback — remove hardcoded models, Obsidian formatting, CodeRabbit fixes ([dc7d8c2](https://github.com/Steffen025/pai-opencode/commit/dc7d8c2beb9ce9e779bd2f65e04791c61da37ae0))
* **wp-n6:** Clarify Bun import extension resolution — .ts not required by default ([4c2ecd9](https://github.com/Steffen025/pai-opencode/commit/4c2ecd989ef38e0366e4fda5e2d8453f06902aa3))
* **wp-n7:** address CodeRabbit review findings ([34f108b](https://github.com/Steffen025/pai-opencode/commit/34f108b0ff8d645b37b7f49b0eca4ef2802a3da5))
* **wp-n7:** address fourth round of CodeRabbit findings ([925aa98](https://github.com/Steffen025/pai-opencode/commit/925aa98c9f7ab4af319c816d93f5dedb424acd18))
* **wp-n7:** address second round of CodeRabbit findings ([623b8cf](https://github.com/Steffen025/pai-opencode/commit/623b8cfe43db3dee0db63bad0517c68dc5ae3d88))
* **wp-n7:** address third round of CodeRabbit findings ([eadb175](https://github.com/Steffen025/pai-opencode/commit/eadb1752b40bcca242696f5ed4d4a99c0d5904f1))
* **wp-n7:** fix Biome CI scope + auto-fix all plugin code quality issues ([24c03d4](https://github.com/Steffen025/pai-opencode/commit/24c03d4b7f96097c5cdccb5e3439bd6136a2d7b6))
* **wp-n8:** remove personal MCP server data from agent matrix ([36b549c](https://github.com/Steffen025/pai-opencode/commit/36b549c749cc2f6c366d351442e576967823e157))
* **wp-n9:** address CodeRabbit findings ([bb04b36](https://github.com/Steffen025/pai-opencode/commit/bb04b361d529496826984163c658173bc2dff195))
* **wp-n9:** address CodeRabbit findings round 3 ([ab37834](https://github.com/Steffen025/pai-opencode/commit/ab378347d31e87083c7898c04fcdbbdfcdd68cc1))
* **wp-n9:** address remaining CodeRabbit findings ([bd0bc9c](https://github.com/Steffen025/pai-opencode/commit/bd0bc9c79403ee112f9fa7469a0f5a8a53e541c8))
* **wp-n9:** align indentation of symlink block to parent scope ([92f14a7](https://github.com/Steffen025/pai-opencode/commit/92f14a71fd5f35e37387a7f275ad1abce845784e))
* **wp-n9:** correct zen advanced model ID to claude-3-5-haiku ([0760018](https://github.com/Steffen025/pai-opencode/commit/076001899dea51f60c434c91fd1cb442cc952034))
* **wp-n9:** defensive copy legacy alias exports to isolate from PROVIDER_MODELS ([60e4b02](https://github.com/Steffen025/pai-opencode/commit/60e4b0284870cc9bc5e3a219fddd66e3bfc3f83e))
* **wp-n9:** generate full agent-tier opencode.json from provider choice ([6c90b36](https://github.com/Steffen025/pai-opencode/commit/6c90b364c658b4ed9ae285d7078369b5c9449ba1))
* **wp-n9:** generate full agent-tier opencode.json from provider choice ([ecf671c](https://github.com/Steffen025/pai-opencode/commit/ecf671c48bbc64bdf7634642a6bced4afbf38b37))
* **wp1:** Address CodeRabbit review comments ([ef72908](https://github.com/Steffen025/pai-opencode/commit/ef7290828ca17baf74bf8899eb29033aa5e4e2e2))
* **wp2:** Address all Code Rabbit review comments ([5253f39](https://github.com/Steffen025/pai-opencode/commit/5253f39914502e84094b9c27e87d74d6f17b6c6f))
* **wp2:** Address CodeRabbit review comments ([83fa771](https://github.com/Steffen025/pai-opencode/commit/83fa7713c3b4d72721c3ab98ab7fd39b8f2b02d7))
* **wp2:** Address CodeRabbit review comments ([4c4c6c8](https://github.com/Steffen025/pai-opencode/commit/4c4c6c82cdff7e3826d6dbe2dbce2a1c920f25fb))
* **wp2:** Address CodeRabbit review comments + add workdir documentation ([4d68988](https://github.com/Steffen025/pai-opencode/commit/4d68988473c201e25af5e705e9e96eac3f7d5f7f))
* **wp2:** All content in English only ([c5c1df7](https://github.com/Steffen025/pai-opencode/commit/c5c1df70657cb88111be6e5974002175fe2d97b0))
* **wp2:** Minimal Nützlich statt minimal möglich ([3c23f24](https://github.com/Steffen025/pai-opencode/commit/3c23f24c3812586d1117fef6b17e89ffc7023cc4))
* **wp2:** Skill Discovery Index im Bootstrap ([dde4e52](https://github.com/Steffen025/pai-opencode/commit/dde4e527e8bdddb9bc8a5c71ab73ad75716a6ec8))
* **wp3:** Address CodeRabbit review findings ([426b7ff](https://github.com/Steffen025/pai-opencode/commit/426b7ff1ed48a11effde16d205acf7fe8c6fd4df))
* **wp3:** Address second round of CodeRabbit review findings ([8154ecc](https://github.com/Steffen025/pai-opencode/commit/8154ecc80c4b3ee33faf2b83c2f128f32e524008))
* **wp4:** Address additional PR [#40](https://github.com/Steffen025/pai-opencode/issues/40) review findings ([2f1e42b](https://github.com/Steffen025/pai-opencode/commit/2f1e42b16c9b84835449b47ae7e336de8bc91c15))
* **wp4:** Address PR [#40](https://github.com/Steffen025/pai-opencode/issues/40) review findings ([cf073d4](https://github.com/Steffen025/pai-opencode/commit/cf073d495522956e947cff9814821a74f07a6565))
* **wp4:** Final CodeRabbit review - platform paths, deterministic output ([987a56e](https://github.com/Steffen025/pai-opencode/commit/987a56eef2b7486d6ea9992e99426b46d0a9e736))
* **wp4:** Final round of PR [#40](https://github.com/Steffen025/pai-opencode/issues/40) review fixes ([3381911](https://github.com/Steffen025/pai-opencode/commit/3381911a14b114d49ba14042664d8179c806c48c))
* **wp4:** Phase 1 - Fix broken skill path references ([18b510e](https://github.com/Steffen025/pai-opencode/commit/18b510e86379d61654d1ca3c9d9d81307fddbf87))
* **wp4:** Phase 1 - Fix broken skill path references ([5527366](https://github.com/Steffen025/pai-opencode/commit/552736626bcc499da257aa367e9795080249bec0))

## [3.0.0] - 2026-04-12

### ⚠️ Breaking Changes

- **`model_tiers` removed (WP-M1 Vanilla OpenCode Migration).** PAI-OpenCode now runs on **vanilla OpenCode** from opencode.ai. The custom `Steffen025/opencode` fork (branch `feature/model-tiers`) is no longer used. Each agent in `opencode.json` has exactly one `model` field — the `model_tiers` block (with `quick`/`standard`/`advanced` sub-models) is no longer supported.
- **`model_tier` parameter removed from Task tool.** Task tool calls no longer accept a `model_tier: "quick" | "standard" | "advanced"` argument. The agent's configured model is always used. See ADR-019 for the full rationale.
- **Installer no longer builds OpenCode from source.** Fresh installs now invoke the official vanilla installer (`curl -fsSL https://opencode.ai/install | bash`) instead of cloning and compiling the fork. Install time drops from ~5-10 minutes to seconds.
- Plugin system migrated from hooks to event-driven architecture (WP-A)
- Skills structure changed: flat → hierarchical Category/Skill (WP-C)
- Config dual-file: `opencode.json` + `settings.json` (replaces single file)
- All paths migrated: `.claude/` → `.opencode/`, `CLAUDE.md` → `AGENTS.md`

### Migration Path (for existing v2.x users with model_tiers)

**Automated:** Run `bun run PAI-Install/engine/migrate-legacy-config.ts ~/.opencode/opencode.json`. This converts old `model_tiers` blocks to the new flat format by preserving each agent's `standard` tier model as the new canonical `model`.

**Manual:** Delete all `model_tiers` blocks from your `opencode.json`. Keep only the top-level `"model"` field per agent. Example:

```jsonc
// BEFORE (v2.x — no longer supported)
"Engineer": {
  "model": "anthropic/claude-sonnet-4-5",
  "model_tiers": {
    "quick": { "model": "anthropic/claude-haiku-4-5" },
    "standard": { "model": "anthropic/claude-sonnet-4-5" },
    "advanced": { "model": "anthropic/claude-opus-4-6" }
  }
}

// AFTER (v3.0+)
"Engineer": {
  "model": "anthropic/claude-sonnet-4-5"
}
```

**For Task tool callers:**

```typescript
// BEFORE (v2.x)
Task({ subagent_type: "Engineer", model_tier: "quick", prompt: "..." })

// AFTER (v3.0+) — use a lightweight agent for cheap work
Task({ subagent_type: "explore", prompt: "..." })     // or "Intern"
// For standard work, just use Engineer
Task({ subagent_type: "Engineer", prompt: "..." })
// For heavy work, use Architect or Algorithm
Task({ subagent_type: "Architect", prompt: "..." })
```

### Added

#### Session Registry (WP-N1) — PR #50
- **`session_registry` custom tool** — Lists all active sessions with IDs and metadata
- **`session_results` custom tool** — Fetches output from a named session
- OpenCode-native session awareness for post-compaction context recovery

#### Compaction Intelligence (WP-N2) — PR #51
- **`experimental.session.compacting` hook** — Detects compaction events in real time
- **Context injection on resume** — Automatically re-injects PAI context after compaction
- Prevents silent context loss mid-session

#### Algorithm Awareness (WP-N3) — PR #52+#53
- **SKILL.md CONTEXT RECOVERY** — Uses `session_registry` + `session_results` for post-compaction awareness
- **PRD `parent_session_id`** — Links child PRDs back to originating session
- Full Algorithm v1.8.0 context continuity across compaction boundaries

#### LSP Documentation (WP-N4) — PR #53
- **AGENTS.md LSP section** — Documents OpenCode's Language Server Protocol integration
- **Installer `.env` setup** — API key configuration documented
- *Note: WP-N4 originally also documented the `Steffen025/opencode` fork and `feature/model-tiers` branch. Those docs were removed in WP-M1 (Vanilla OpenCode Migration, see below) and replaced with vanilla OpenCode install instructions.*

#### Plan Update (WP-N5) — PR #54
- **All planning docs synced** — TODO-v3.0.md, OPTIMIZED-PR-PLAN.md reflect WP-N1..N4 complete
- Progress diagrams updated

#### System Self-Awareness (WP-N6) — PR #55
- **OpenCodeSystem skill** — Self-referential skill for system introspection
- **4 architecture reference docs** — SystemArchitecture.md, ToolReference.md, Configuration.md, Troubleshooting.md
- **ADR-017** — System self-awareness architectural decision

#### roborev + Biome CI (WP-N7) — PR #56
- **roborev plugin handler** — `plugins/handlers/roborev-trigger.ts` for AI code review
- **CodeReview skill** — `skills/CodeReview/SKILL.md` for in-session code review
- **GitHub Actions CI** — `.github/workflows/code-quality.yml` runs Biome on every PR
- **ADR-018** — roborev + Biome CI architectural decision

#### Obsidian Formatting Guidelines (WP-N8) — PR #57
- **FormattingGuidelines.md** — Obsidian frontmatter, callouts, Mermaid, code block patterns
- **AgentCapabilityMatrix.md** — All agent types, agent models, tool/MCP access, decision rules

#### Installer opencode.json Fix (WP-N9) — PR #58
- **4 provider presets** — anthropic, zen, openrouter, openai (was 3)
- **opencode.json generation** — Correct provider-specific config per preset
- `principalName` populated from username during install

#### Docs Consolidation (WP-N10) — PR #59
- **CHANGELOG.md** — Released, WP-N1..N10 Added sections with correct WP titles
- **CONTRIBUTING.md** — Skills structure updated to hierarchical `Category/SkillName/`
- **INSTALL.md** — 4 provider presets documented
- **README.md** — Broken links to non-existent files removed
- **Planning docs deleted** — GAP-ANALYSIS-v3.0.md, EPIC-v3.0-OpenCode-Native.md, OPENCODE-NATIVE-RESEARCH.md (completed, no longer needed)

#### Vanilla OpenCode Migration (WP-M1)
- **ADR-019** — `docs/architecture/adr/ADR-019-vanilla-opencode-migration.md` — Architectural decision record documenting the `model_tiers` removal, fork archival rationale, and rejected alternatives
- **Legacy-config migration script** — `PAI-Install/engine/migrate-legacy-config.ts` — Automated converter for user `opencode.json` files with legacy `model_tiers` blocks, preserves each agent's `standard` tier model as the new canonical `model`, creates `.pre-v3.0.bak` backup before any changes
- **Vanilla installer path** — `PAI-Install/engine/actions.ts` — New `installVanillaOpenCode()` function calls `curl -fsSL https://opencode.ai/install | bash` instead of cloning a fork
- **Deprecation notices** — Troubleshooting.md, ToolReference.md, AgentCapabilityMatrix.md, and PLATFORM-DIFFERENCES.md gained explicit deprecation callouts explaining the `model_tier` removal and pointing to the migration script
- **Partial supersession markers** — ADR-005 and ADR-012 gained `> [!warning] PARTIAL SUPERSESSION` notices at the top plus inline historical notes, preserving decision history while clarifying which parts are superseded by ADR-019

### Removed (WP-M1 Vanilla Migration)

- `PAI-Install/engine/build-opencode.ts` — the entire 245-LOC fork build system
- `model_tiers` config block from `opencode.json` (16 agents, all tiers stripped)
- `model_tier` parameter reading from `.opencode/plugins/handlers/agent-execution-guard.ts`
- `modelTier` field from `.opencode/plugins/handlers/session-registry.ts` session entries
- `tiers?` field from `AgentConfig` interface in `.opencode/tools/switch-provider.ts`
- `tiers:` sections from all 5 profile YAML files (`.opencode/profiles/{anthropic,openai,zen,zen-paid,local}.yaml`)
- Fork-clone / build-from-source logic from `PAI-Install/engine/actions.ts`, `steps-fresh.ts`, `steps-migrate.ts`, `steps-update.ts`
- `runSkipBuildFallback` dead code from `PAI-Install/cli/install-wizard.ts`
- `model_tier mapping` requirement from `.coderabbit.yaml` agent frontmatter validation rule
- `stepBuildOpenCode` and `stepBinaryUpdate` binary-build logic — functions retained as no-ops for API compatibility, delegations to fork-build removed
- All references to `Steffen025/opencode` URLs and `feature/model-tiers` branch from runtime code

### Changed (WP-M1 Vanilla Migration)

- `PAI-Install/wrapper-template.sh` — Rewritten from custom-build launcher to vanilla-OpenCode wrapper. `--rebuild` replaced with `--install` (invokes `opencode.ai/install`).
- `PAI-Install/engine/actions.ts` — `buildOpenCodeFromSource()` replaced with `installVanillaOpenCode()` which runs the official vanilla install script.
- `opencode.json` — Flat one-model-per-agent format. Sensible defaults: Algorithm=Opus, explore/Intern=Haiku, everyone else=Sonnet.
- `.opencode/profiles/*.yaml` — All 5 profiles (anthropic, openai, zen, zen-paid, local) collapsed to `model:` per agent; tier sub-keys removed.
- `README.md`, `INSTALL.md`, `UPGRADE.md`, `KNOWN_LIMITATIONS.md`, `docs/**`, `EPIC-v3.0-Synthesis-Architecture.md` — All documentation rewritten to reflect vanilla OpenCode and agent-based cost optimization.

### Deprecated (WP-M1 Vanilla Migration)

- `--skip-build` CLI flag — silently ignored with deprecation warning. Will be removed in a future release.

### Changed
- Skills organization: flat → hierarchical (Category/Skill)
- Config management: single-file → dual-file
- Installer: CLI-only → CLI + Electron GUI
- Security: none → full prompt injection protection

### Migration
- See [UPGRADE.md](/UPGRADE.md) for detailed migration instructions
- Run `bun Tools/migration-v2-to-v3.ts --dry-run` to preview
- Automatic backup created before any changes

---

## [2.0.0] - 2026-02-19

### Breaking Changes
- Algorithm format changed (8 effort levels replace FULL/ITERATION/MINIMAL depth)
- Start symbol changed from 🤖 to ♻︎
- ISC naming convention updated to ISC-{Domain}-{N} with priority/confidence tags
- SKILL.md completely rewritten — Algorithm v1.2.0 → **v1.8.0** (upstream sync)

### Added

#### v1.2.0 Base (2026-02-17)
- **Constraint Extraction System** — Mechanical [EX-N] extraction before ISC
- **Self-Interrogation** — 5 structured questions before BUILD
- **Build Drift Prevention** — Re-read [CRITICAL] ISC before each artifact
- **Verification Rehearsal** — Simulate violations in THINK phase
- **Mechanical Verification** — No rubber-stamp PASS, require evidence
- **8 Effort Levels** — Instant, Fast, Standard, Extended, Advanced, Deep, Comprehensive, Loop
- **7 Quality Gates** — QG1-QG7 must pass before proceeding
- **25-Capability Full Scan Audit** — Replaces Two-Pass capability selection
- **PRD System** — Persistent Requirements Documents for cross-session tracking
- **Anti-Criteria** — ISC-A-{Domain}-{N} for what must NOT happen
- **Algorithm Reflection JSONL** — Structured Q1/Q2/Q3 learning capture
- **OBSERVE Hard Gate** — Thinking-only phase, no tool calls except TaskCreate
- **AUTO-COMPRESS** — Drop effort tier when >150% of phase budget
- **10 new skills** — Cloudflare, ExtractWisdom, IterativeDepth, Science, Parser, Remotion, Sales, USMetrics, WorldThreatModelHarness, WriteStory
- **5 new plugin handlers** — algorithm-tracker, agent-execution-guard, skill-guard, check-version, integrity-check
- **format-reminder handler** updated for 8-tier effort level system
- **PRD directory structure** with templates and lifecycle management

#### Upstream Sync v1.3.0–v1.8.0 (2026-02-19)
Porting 14 upstream commits spanning Algorithm v1.3.0 through v1.8.0:

- **Verify Completion Gate (v1.6.0)** — CRITICAL: Prevents "PASS" claims without actual TaskUpdate calls. NON-NEGOTIABLE at ALL effort levels.
- **Phase Separation Enforcement (v1.6.0)** — "STOP" markers on THINK, PLAN, BUILD, EXECUTE, VERIFY phases
- **Zero-Delay Output Section (v1.6.0)** — Instant output before any processing
- **Self-Interrogation Effort Scaling (v1.3.0)** — Instant/Fast skip, Standard answers 1+4, Extended+ answers all 5
- **Constraint Extraction Effort Scaling (v1.3.0)** — Gate added for effort levels below Standard
- **Steps 6-8 Gated to Extended+ (v1.3.0)** — Constraint Fidelity System steps scale by effort
- **QG6/QG7 Gated to Extended+ (v1.3.0)** — Quality gates scale by effort in OBSERVE and PLAN
- **ISC Scale Tiers Updated (v1.3.0)** — Simple: 4-16, Medium: 17-32, Large: 33-99, Massive: 100-500+
- **BUILD Capability Execution Substep (v1.8.0)** — Explicit capability execution within BUILD
- **Wisdom Injection OUTPUT 1.75 (v1.8.0)** — Injects domain wisdom between Constraint Extraction and ISC
- **Wisdom Frame Update in LEARN (v1.8.0)** — Captures new wisdom into domain frames
- **Algorithm Reflection Moved First in LEARN (v1.8.0)** — Reflection before PRD LOG
- **Wisdom Frames System** — `MEMORY/WISDOM/` directory with 5 seed domain frames (development, deployment, security, architecture, communication)
- **WisdomFrameUpdater.ts** — CLI tool for managing wisdom frames (`--domain`, `--observation`, `--type`, `--list`, `--show`)
- **Security Validator env var prefix fix** — Upstream #620: strips `export/set/declare/readonly` prefixes to prevent false positives
- **Rating Capture 5/10 noise filter** — Ambiguous 5/10 ratings skip learning file generation (still tracked in JSONL)
- **Symlink support in GenerateSkillIndex.ts** — `findSkillFiles()` follows symlinks to directories, handles broken symlinks gracefully
- **SessionHarvester PAI_DIR rename** — `CLAUDE_DIR` → `PAI_DIR` with `process.env.PAI_DIR` fallback

### Changed
- SKILL.md rewritten from Algorithm v0.2.25 to **v1.8.0** (was v1.2.0)
- Capability selection now uses 25-capability full scan (was Two-Pass)
- ISC criteria now use domain-grouped naming convention
- format-reminder handler enhanced with effort level detection
- Constraint Fidelity System updated to v1.3.0
- LEARN phase restructured: Algorithm Reflection → PRD LOG → Wisdom Frame Update → Learning → Voice
- Voice curl commands now use `{DAIDENTITY.ALGORITHMVOICEID}` template variable

### Not Portable (Claude Code Only)
- Agent Teams/Swarm (requires CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1)
- Plan Mode (EnterPlanMode/ExitPlanMode built-in tools)
- StatusLine (Claude Code UI feature)

---

## v2.0.1 — Legacy Installer Build Process Fix (2026-02-20)

### Fixed

#### Critical: Legacy Installer Build-from-Source Completely Broken
- **Symptom:** `git clone` succeeds but legacy installer reports "Failed to clone repository" and aborts
- **Root cause:** `execCommand()` with `stdio: 'inherit'` returns `null` from `execSync()`. Calling `.trim()` on `null` throws TypeError, caught as failure. **Every non-silent command falsely reports failure.**
- **Fix:** Null-safe guard: `output.trim()` → `(output ?? '').trim()`

#### Go Prerequisite Removed (No Longer Needed)
- **Context:** OpenCode was historically a Go project (BubbleTea TUI). It has been completely rewritten to Bun/TypeScript. The build now uses `Bun.build({ compile: true })` to produce native binaries — no Go toolchain needed.
- **Fix:** Removed Go prerequisite check from the legacy installer and all documentation
- **Fix:** Strengthened Bun version check from 1.3+ to 1.3.9+ (matches OpenCode monorepo `packageManager` field)

#### Binary Detection After Build
- **Symptom:** After successful build, legacy installer couldn't find the binary
- **Root cause:** Generic filename search didn't match `Bun.build()` output structure (`dist/opencode-{os}-{arch}/bin/opencode`)
- **Fix:** Deterministic platform-based binary lookup using `process.platform` + `process.arch` with baseline fallback

### Changed
- **Legacy installer messaging** updated to reflect Bun-based build (not Go)
- **INSTALL.md** — Prerequisites: removed Go, added Bun 1.3.9+ note. Manual install: complete rewrite with `bun run ./packages/opencode/script/build.ts --single`. WSL section: removed `golang-go` package.
- **README.md** — Quick Start: added prerequisites line, updated installer step description
- **docs/MIGRATION.md** — Replaced `go install` with installer command, replaced `$(go env GOPATH)/bin` with `~/.local/bin` in PATH troubleshooting
- **EXPLORATION-SUMMARY.md (since removed)** — Updated wizard flow description

---

## v1.3.2 — Wizard Fixes + Fork Alignment (2026-02-11)

### Fixed
- **Wizard:** 4 provider presets (Anthropic, Zen Paid, Zen Free, Ollama Local) with clearer auth guidance
- **Wizard:** Build-from-source now clones from `Steffen025/opencode` fork (`feature/model-tiers` branch)
- **Wizard:** Non-blocking Go prerequisite check (warning only, no abort)
- **Wizard:** Auto-creates `.opencode/opencode.json` symlink → `../opencode.json` (single source of truth)
- **Voice Server:** macOS `say` TTS fallback when no API keys configured
- **Observability Dashboard:** Fixed `type` → `event_type` field naming across all Vue components
- **Observability Server:** Added `completeSession()` on `session.end` events

### Deprecated
- **Observability Dashboard** — Will be removed in a future version. The Vue-based dashboard adds significant dependency overhead with limited practical value. Server-side JSONL event logging remains unaffected.

---

## v1.3.1 — Plugin Crash Fix + Interface Alignment (2026-02-11)

### Fixed

#### Critical: Tool Execution Crash (All Tools Affected)
- **Symptom:** ALL tools (Bash, Read, Glob, Grep, etc.) crashed with `TypeError: undefined is not an object (evaluating 'Object.keys(args)')`
- **Root cause:** Interface mismatch between `pai-unified.ts` (caller) and `observability-emitter.ts` (receiver). Emit functions expected positional parameters but were called with object parameters after a feature sync.
- **Fix:** All 14 emit functions in `observability-emitter.ts` converted to accept object parameters with defensive null-checks. All 17 call-sites in `pai-unified.ts` updated to match.

#### Critical: OpenCode Startup Failure
- **Symptom:** OpenCode refused to start with config validation error
- **Root cause:** Invalid `"pai"` top-level key in `opencode.json` — OpenCode doesn't recognize this config key
- **Fix:** Removed `"pai"` block from `opencode.json`

#### Installation Wizard: Build-from-Source Completely Broken ([#21](https://github.com/Steffen025/pai-opencode/issues/21))
- **Symptom:** `git clone` in wizard fails with 404; even if clone succeeded, build would fail
- **Root cause 1:** Clone URL referenced `nicepkg/opencode.git` which no longer exists
- **Root cause 2:** Build commands used `go build` — but OpenCode is a TypeScript/Bun project, not Go
- **Root cause 3:** Install paths referenced `~/go/bin` which is irrelevant
- **Fix:** Complete rewrite of build-from-source function:
  - Clone URL updated to `anomalyco/opencode.git`
  - Build process now uses `bun install` + `bun run ./packages/opencode/script/build.ts --single`
  - Added Bun 1.3+ prerequisite check with version validation
  - Binary search in `packages/opencode/dist/` with platform-specific names
  - Install to `~/.local/bin` or `/usr/local/bin` (removed Go paths)

### Changed

#### Simplified Versioning
- **Removed `@version` tags** from individual plugin handler files (`pai-unified.ts`, `observability-emitter.ts`, `implicit-sentiment.ts`)
- **Single version source:** Only the repository version (in README + CHANGELOG) matters. Individual subsystems don't have their own version lifecycle since they're always released together.

---

## v1.3.0 — Dynamic Per-Task Model Tier Routing (2026-02-10)

### 🚀 Major: Dynamic Tier Routing Across Provider Boundaries

**The orchestrator now automatically routes each task to the right model at the right cost — and the same agent scales up or down dynamically based on task complexity.**

This is a turning point for PAI-OpenCode. Up until v1.2, we were running a 1:1 port of vanilla PAI. With v1.3.0, we leverage what makes OpenCode unique: multi-provider support with dynamic model routing.

As far as we can tell, no other AI coding assistant or agent framework currently offers this pattern of dynamic per-task model tier routing across provider boundaries.

#### How It Works

- **Three-tier model routing** — `quick`, `standard`, `advanced` tiers per agent in `opencode.json`
- **Orchestrator decides per task** — Same Engineer uses GLM 4.7 for batch edits, Kimi K2.5 for features, Claude Sonnet 4.5 for complex debugging
- **You always pay exactly what the task requires** — no more, no less
- Backward-compatible: `model` field still works as fallback

#### Dynamic Tier Routing Table

| Agent | Default | Scales Down To | Scales Up To |
|-------|---------|----------------|--------------|
| **Architect** | Kimi K2.5 | GLM 4.7 (quick review) | Claude Opus 4.6 (complex architecture) |
| **Engineer** | Kimi K2.5 | GLM 4.7 (batch edits) | Claude Sonnet 4.5 (complex debugging) |
| **DeepResearcher** | GLM 4.7 | MiniMax (quick lookup) | Kimi K2.5 (deep analysis) |
| **GeminiResearcher** | Gemini 3 Flash | — | Gemini 3 Pro (deep research) |
| **PerplexityResearcher** | Sonar | — | Sonar Deep Research |
| **GrokResearcher** | Grok 4.1 Fast | — | Grok 4.1 (full analysis) |
| **CodexResearcher** | GPT-5.1 Codex Mini | — | GPT-5.2 Codex |
| **Writer** | Gemini 3 Flash | MiniMax (quick drafts) | Claude Sonnet 4.5 (premium copy) |
| **Pentester** | Kimi K2.5 | GLM 4.7 (quick scan) | Claude Sonnet 4.5 (deep audit) |
| **Intern** | MiniMax M2.1 | — | — |
| **explore** | MiniMax M2.1 | — | — |
| **QATester** | GLM 4.7 | — | — |

#### Agent System Changes
- **Model routing centralized** — Agent `.md` files no longer contain `model:` in frontmatter. ALL model routing now lives exclusively in `opencode.json`
- **15 specialized agents** with dynamic tier routing
- **DeepResearcher** replaces ClaudeResearcher (provider-agnostic naming)
- **Removed** PerplexityProResearcher (redundant), researcher (lowercase duplicate)

**Migration Notes:**
- ⚠️ **If you have custom workflows referencing `ClaudeResearcher`**, update them to `DeepResearcher`
- ⚠️ **If you have custom skills referencing `PerplexityProResearcher`**, migrate to `PerplexityResearcher` with `model_tier: standard` (Sonar Pro). Use `model_tier: advanced` only for Sonar Deep Research.

#### 3 Configuration Presets
- **`zen-paid`** (Recommended) — 75+ providers via Zen AI Gateway. Combine providers freely.
- **`openrouter`** — OpenRouter routing with familiar model names.
- **`local-ollama`** — Fully local with Ollama. Zero cloud, complete privacy.

#### Provider Profiles (v3.0)
- **New YAML format** with `default_model` + `agents` structure including `tiers`
- **New profile:** `zen-paid.yaml` for privacy-preserving pay-as-you-go models
- **Renamed:** `zen.yaml` is now ZEN FREE (community/free models)
- **Removed:** `google.yaml` (use manual config via [ADVANCED-SETUP.md](docs/ADVANCED-SETUP.md))
- **switch-provider.ts v3.0** — Updated for new profile format with model_tiers generation

#### Documentation
- **NEW:** `ADVANCED-SETUP.md` — Guide for multi-provider research, custom models, and manual configuration
- **Updated:** PAIAGENTSYSTEM.md fully rewritten with model tier guide and dynamic routing
- **Updated:** README.md with dynamic tier routing table and new presets
- **47 documentation gaps** fixed across 11 files

#### Image Optimization
- All 17 images in `docs/images/` resized and compressed
- **Total reduction: 12.4 MB → 2.6 MB (79%)**

### Breaking Changes
- Profile YAML format changed (`models:` → `default_model:` + `agents:` with `tiers`)
- `ClaudeResearcher` renamed to `DeepResearcher` (update any custom workflows)
- `PerplexityProResearcher` removed (use `PerplexityResearcher` with `standard` tier for Sonar Pro)
- Agent `.md` files no longer accept `model:` field — use `opencode.json` exclusively
- Google profile removed — configure manually if needed

#### Profile Format Change (Before → After)

**Old format (v1.2.x):**
```yaml
models:
  - model: anthropic/claude-opus-4-6
    agents: [Algorithm]
  - model: anthropic/claude-sonnet-4-5
    agents: [Architect, Engineer, Writer]
```

**New format (v1.3.0):**
```yaml
default_model: anthropic/claude-sonnet-4-5
agents:
  Algorithm:
    model: anthropic/claude-opus-4-6
    tiers:
      quick: anthropic/claude-haiku-4-5
      standard: anthropic/claude-sonnet-4-5
      advanced: anthropic/claude-opus-4-6
```

### Stats
- **113 files changed**, 2,824 insertions, 1,792 deletions
- **15 agents** with dynamic tier routing
- **3 presets** ready to use

### Migration Guide
1. Re-run the installer update flow: `bash PAI-Install/install.sh --update`
2. Or switch profile manually: `bun run .opencode/tools/switch-provider.ts zen-paid`
3. Custom agent models → Edit `opencode.json` agent section directly

---

## [1.2.1] - 2026-02-06

### Major Feature: Provider Profile System + Multi-Provider Research

One-command provider switching for all 18 agent models, with optional multi-provider research routing for diverse AI perspectives.

### Added

#### Provider Profile System
- **5 Provider Profiles** (`profiles/*.yaml`): Anthropic, OpenAI, Google, ZEN (free), Local (Ollama)
- **3-Tier Model Strategy**: Each profile maps agents to Most Capable → Standard → Budget tiers
- **`switch-provider.ts` v2.0**: CLI tool to switch all agent models with one command
  - `bun run switch-provider.ts anthropic` — switch to Anthropic
  - `bun run switch-provider.ts --list` — show available profiles
  - `bun run switch-provider.ts --current` — show active configuration
  - `bun run switch-provider.ts --researchers` — show researcher routing status

#### Multi-Provider Research
- **`--multi-research` flag**: Routes research agents to their native providers for diverse perspectives
  - GeminiResearcher → `google/gemini-2.5-flash`
  - GrokResearcher → `xai/grok-4-1-fast`
  - PerplexityResearcher → `perplexity/sonar`
  - PerplexityProResearcher → `perplexity/sonar-pro`
  - CodexResearcher → `openrouter/openai/gpt-4.1`
- **`researchers.yaml`**: Native researcher-to-provider mapping configuration
- **Graceful fallback**: Missing API keys → researcher uses primary provider instead
- **User-driven opt-in**: No automatic detection — user decides via `--multi-research` flag

#### Installation Wizard Updates
- **New Step 1b**: "Research Agent Configuration" — asks user to choose single or multi-provider research
- **Profile-based generation**: Wizard now uses `applyProfile()` from switch-provider.ts (single source of truth)
- **Research mode display**: Success screen shows research configuration status

### Changed

#### Provider Profile Models (Verified from anomalyco/opencode source)
| Profile | Most Capable | Standard | Budget |
|---------|-------------|----------|--------|
| **Anthropic** | `anthropic/claude-opus-4-6` | `anthropic/claude-sonnet-4-5` | `anthropic/claude-haiku-4-5` |
| **OpenAI** | `openai/gpt-5.1` | `openai/gpt-4.1` | `openai/gpt-4.1-mini` |
| **Google** | `google/gemini-2.5-pro` | `google/gemini-2.5-flash` | `google/gemini-2.0-flash-lite` |
| **ZEN** | `opencode/big-pickle` | `opencode/kimi-k2.5-free` | `opencode/gpt-5-nano` |
| **Local** | `ollama/qwen2.5-coder:32b` | `ollama/qwen2.5-coder:7b` | `ollama/qwen2.5-coder:1.5b` |

#### Documentation Overhaul
- **README.md**: Updated Quick Start, research agent models, provider switching docs
- **INSTALL.md**: Added "Existing OpenCode Users" section addressing symlink workflow (fixes #14)
- **INSTALL.md**: Replaced outdated "Option A/B/C" API Configuration with profile-based switching
- **INSTALL.md**: Updated API Keys table with current model names

### Fixed
- **ZEN profile**: Replaced non-free models (`opencode/claude-sonnet-4-5`) with actual free models
- **OpenAI profile**: Updated from deprecated `gpt-4o`/`gpt-4o-mini` to `gpt-5.1`/`gpt-4.1`/`gpt-4.1-mini`
- **Google profile**: Added proper 3-tier (was all `gemini-2.5-flash`), uses `gemini-2.0-flash-lite` for budget
- **Local profile**: Added guidance comments for Ollama users on which models to pull
- **switch-provider.ts**: Module export guard prevents CLI execution when imported by wizard

### Technical Details
- **Profile Format**: YAML files in `.opencode/profiles/` with `provider/model` format
- **Researcher Overlay**: `researchers.yaml` defines native model + required API key per researcher
- **API Key Detection**: Reads `~/.opencode/.env` to check for available provider keys
- **Settings Tracking**: `settings.json` records `multiResearch` state and active profile

---

## [1.2.0] - 2026-02-05

### Major Feature: Real-Time Observability Dashboard

This release introduces a complete monitoring infrastructure for PAI-OpenCode with real-time event streaming, SQLite persistence, and a Vue 3 dashboard.

### Added

#### Observability Server
- **Bun HTTP Server** on port 8889 with REST API and SSE streaming
- **SQLite Database** for event persistence with 30-day retention
- **14 Event Types** captured across all plugin hooks
- **Real-time SSE Stream** at `/api/events/stream`

#### API Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check with server stats |
| `/events` | POST | Event ingestion from plugins |
| `/api/events` | GET | Query events with filters |
| `/api/events/stream` | GET | SSE real-time stream |
| `/api/sessions` | GET | Query sessions |
| `/api/stats` | GET | Aggregated statistics |

#### Vue 3 Dashboard
- **Dashboard Page**: Real-time stats cards + live event stream
- **Events Page**: Searchable/filterable event browser with pagination
- **Sessions Page**: Session list with expandable event details
- **GitHub Dark Theme**: Professional #0d1117 color scheme
- **SSE Connection**: Live updates with pause/resume and reconnect

#### New Handler
| Handler | Purpose |
|---------|---------|
| `observability-emitter.ts` | Fire-and-forget event emission to observability server |

#### Event Types Captured
- Session lifecycle: `session.start`, `session.end`
- Tool execution: `tool.execute`, `tool.blocked`
- Security: `security.block`, `security.warn`
- Messages: `message.user`, `message.assistant`
- Ratings: `rating.explicit`, `rating.implicit`
- Agents: `agent.spawn`, `agent.complete`
- Voice: `voice.sent`
- Learning: `learning.captured`
- Validation: `isc.validated`, `context.loaded`

### Technical Details
- **Server Stack**: Bun HTTP + SQLite (bun:sqlite)
- **Dashboard Stack**: Vue 3.4 + Vite 5 + Tailwind CSS 3.4 + TypeScript
- **Plugin Integration**: 82 new lines in `pai-unified.ts`
- **Event Emission**: 1s timeout, fail silently (non-blocking)

### File Structure
```
.opencode/observability-server/
├── server.ts          # HTTP server (:8889)
├── db.ts              # SQLite operations
├── README.md          # Documentation
└── dashboard/         # Vue 3 SPA
    ├── src/components/  # StatsCards, EventStream, EventList, SessionList
    ├── src/pages/       # Dashboard, Events, Sessions
    └── [config]         # Vite, Tailwind, TypeScript
```

---

## [1.1.0] - 2026-02-02

### Major Upgrade: PAI 2.5 + Voice/Sentiment Handlers

This release brings full PAI 2.5 Algorithm compatibility and adds 5 new handlers for voice notifications, sentiment detection, and observability.

### Added

#### PAI 2.5 Algorithm Core
- **Full 7-phase Algorithm** (v0.2.25): OBSERVE, THINK, PLAN, BUILD, EXECUTE, VERIFY, LEARN
- **ISC Validator** with TaskCreate/TaskList for verifiable criteria
- **Capability Selection** with Thinking Tools Assessment in THINK phase
- **Two-Pass capability selection**: Hook hints (Pass 1) + THINK validation (Pass 2)
- **Parallel-by-default execution**: Independent tasks run concurrently
- **Justify-exclusion principle**: Thinking tools are opt-OUT, not opt-IN

#### New Handlers (v1.1)
| Handler | Purpose |
|---------|---------|
| `voice-notification.ts` | TTS via ElevenLabs Voice Server, Google Cloud TTS, or macOS `say` fallback |
| `implicit-sentiment.ts` | Automatic satisfaction detection from natural language (uses Haiku inference) |
| `tab-state.ts` | Updates Kitty terminal tab title and color based on task context |
| `update-counts.ts` | Counts skills, workflows, plugins, signals at session end |
| `response-capture.ts` | ISC extraction, satisfaction tracking, learning capture |

#### Support Libraries
- `lib/time.ts` - ISO timestamps, PST timestamps, year-month formatting

### Changed
- Upgraded from PAI 2.4 to PAI 2.5 Algorithm
- Plugin system now has 13 handlers (up from 8)
- Enhanced SKILL.md with full Algorithm v0.2.25 documentation

### Technical Details
- Build: 21 modules, 85.77 KB total
- All handlers integrated in `pai-unified.ts`
- Graceful fallbacks: Voice handlers fail silently if services unavailable

---

## [1.0.1] - 2026-02-01

### Fixed
- Anthropic Max Subscription API blocking workaround
- ISCValidator integration improvements

---

## [1.0.0] - 2026-01-24

### Initial Release: Core PAI on OpenCode

**The complete port of Daniel Miessler's PAI to OpenCode.**

### Added

#### Core Systems
- **Skills System**: 29 skills (CORE, Algorithm, Fabric, Research, Art, etc.)
- **Agent System**: 14 agents with PascalCase naming
- **Memory System**: Projects, sessions, learning loops
- **Plugin System**: Security validator, context loader

#### Plugin Handlers (v1.0)
| Handler | Purpose |
|---------|---------|
| `context-loader.ts` | Loads CORE context at session start |
| `security-validator.ts` | Blocks dangerous commands |
| `rating-capture.ts` | Captures user ratings (1-10) |
| `isc-validator.ts` | Validates ISC criteria |
| `learning-capture.ts` | Saves learnings to MEMORY |
| `work-tracker.ts` | Tracks work sessions |
| `skill-restore.ts` | Restores skill context |
| `agent-capture.ts` | Captures agent outputs |

#### Installation
- Legacy interactive installer (removed; CLI installer is canonical)
- 8 AI providers supported (Anthropic, OpenAI, Google, Groq, AWS Bedrock, Azure, ZEN, Ollama)
- TELOS personalization framework

#### Documentation
- 7 Architecture Decision Records (ADRs)
- Complete migration guide from Claude Code PAI
- Plugin development documentation

### Architecture Decisions
| ADR | Decision |
|-----|----------|
| ADR-001 | Hooks → Plugins architecture |
| ADR-002 | `.claude/` → `.opencode/` directory |
| ADR-003 | Skills system unchanged |
| ADR-004 | File-based plugin logging |
| ADR-005 | Dual config files approach |
| ADR-006 | Security patterns preserved |
| ADR-007 | Memory structure preserved |

---

## Version Comparison

| Feature | v1.0.0 | v1.1.0 | v1.2.0 | v1.2.1 | v1.3.0 | v2.0.0 | **v3.0.0** |
|---------|--------|--------|--------|--------|--------|--------|------------|
| PAI Version | 2.4 | **2.5** | 2.5 | 2.5 | 2.5 | **3.0** | **3.0** |
| Algorithm | Basic | **Full 7-phase** | Full 7-phase | Full 7-phase | Full 7-phase | **v1.8.0** | **v1.8.0** |
| Handlers | 8 | **13** | 13 | 13 | 13 | 13 | **16** |
| Agents | 14 | 14 | 14 | 18 | **15 (cleaned)** | 15 | **16** |
| Dynamic Tier Routing | No | No | No | No | **Yes** | Yes | Yes |
| Provider Profiles | No | No | No | **Yes (5)** | **Yes (6)** | Yes (6) | Yes (6) |
| Multi-Provider Research | No | No | No | **Yes** | **Yes** | Yes | Yes |
| Observability Dashboard | No | No | **Yes** | Yes | Yes | Yes | Yes |
| Voice Notifications | No | **Yes** | Yes | Yes | Yes | Yes | Yes |
| Sentiment Detection | No | **Yes** | Yes | Yes | Yes | Yes | Yes |
| Image Optimization | No | No | No | No | **79% reduction** | 79% reduction | 79% reduction |
| Wisdom Frames | No | No | No | No | No | **Yes (5 domains)** | Yes (5 domains) |
| Verify Completion Gate | No | No | No | No | No | **Yes** | Yes |
| Effort-Scaled Gates | No | No | No | No | No | **Yes** | Yes |
| **DB Health Tooling** | No | No | No | No | No | No | **Yes** |
| **Installer (CLI-only)** | No | No | No | No | No | No | **Yes** |
| **v2→v3 Migration** | No | No | No | No | No | No | **Yes** |
| **Security Hardening** | No | No | No | No | No | No | **Full** |

---

## Upgrade Path

### From v2.x to v3.0.0 (Breaking Changes)

**Before you start:** The v3.0.0 release has significant breaking changes:
- Skills structure: flat → hierarchical (Category/Skill)
- Config: single-file → dual-file (opencode.json + settings.json)
- Paths: `.claude/` → `.opencode/`
- New CLI-only installer

**Recommended upgrade process:**

1. **Backup your existing installation:**
   ```bash
   cp -r ~/.opencode ~/.opencode-backup-$(date +%Y%m%d)
   ```

2. **Run the migration tool (dry-run first):**
   ```bash
   bun Tools/migration-v2-to-v3.ts --dry-run
   ```

3. **Review the migration report**, then execute:
   ```bash
   bun Tools/migration-v2-to-v3.ts
   ```

4. **Alternative: Fresh install (recommended for a clean setup):**
   ```bash
    bash PAI-Install/install.sh
   ```

**See [UPGRADE.md](/UPGRADE.md) for detailed step-by-step instructions.**

### From v1.2.x to v1.3.0

```bash
git fetch origin
git checkout main
git pull origin main
 bash PAI-Install/install.sh --update
```

Re-running the installer is recommended — it generates the new profile format with dynamic tier routing.

**Manual alternative:** `bun run .opencode/tools/switch-provider.ts zen-paid`

### Voice Server Setup (Optional)

To enable voice notifications:

1. Start the included voice server:
   ```bash
   cd .opencode/voice-server && bun run server.ts
   ```
2. Configure TTS provider in `.opencode/.env`:
   - ElevenLabs: `ELEVENLABS_API_KEY=your_key`
   - Google Cloud TTS: `GOOGLE_API_KEY=your_key`
3. Fallback: macOS `say` command works automatically

See `.opencode/voice-server/README.md` for full documentation.

---

**Links:**
- [PAI v3.0 Upstream](https://github.com/danielmiessler/Personal_AI_Infrastructure)
- [OpenCode](https://github.com/anomalyco/opencode)
- [Upstream Sync Spec](docs/specs/UPSTREAM-SYNC-v1.8.0-SPEC.md)
