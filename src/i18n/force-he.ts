// The admin app is Hebrew-only, always — there is no per-user or per-business
// language preference here (unlike enroll-consumer). This must be imported
// before `./index` (which re-exports enroll-core's i18n singleton) so that
// enroll-core's module-level init reads 'he' from localStorage on its very
// first synchronous pass, instead of a stale 'enroll-lang' value left behind
// by the consumer app or a same-origin session. That avoids any flash of
// English/LTR content and any dependency on business.default_language.
//
// The key below must match enroll-core's LANG_STORAGE_KEY ('enroll-lang').
// It can't be imported from '@vitskyds/enroll-core' here, because that
// package bundles the i18n module together with everything else — importing
// any symbol from it would run the side-effecting init before this file's
// own code gets a chance to set localStorage first.
localStorage.setItem('enroll-lang', 'he')
