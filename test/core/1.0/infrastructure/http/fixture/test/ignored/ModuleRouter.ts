// Discovery fixture placed under a `test/` directory: discovery must skip it. Loading it would throw.
throw new Error('A router under a test/ directory must never be discovered.');
