const { withMainActivity } = require('@expo/config-plugins');

module.exports = function withAndroidKeyboardFix(config) {
  return withMainActivity(config, (config) => {
    let contents = config.modResults.contents;

    if (!contents.includes('class MainActivity : ReactActivity')) return config;

    if (contents.includes('BOOKBLA_IME_INSETS_FIX_START')) return config;
    if (contents.includes('WindowInsetsCompat.Type.ime()')) return config;

    const importsToAdd = [
      'android.os.Build',
      'android.os.Bundle',
      'android.view.View',
      'androidx.core.view.ViewCompat',
      'androidx.core.view.WindowInsetsCompat',
    ];
    const addMissingImports = (src, imports) => {
      const lines = src.split('\n');
      const existing = new Set(
        lines
          .filter((l) => l.trim().startsWith('import '))
          .map((l) => l.trim().replace(/^import\s+/, '').replace(/;$/, ''))
      );
      const missing = imports.filter((imp) => !existing.has(imp));
      if (missing.length === 0) return src;
      const block = missing.map((imp) => `import ${imp}`).join('\n');
      return src.replace(/(package[^\n]*\n)/, `$1${block}\n`);
    };
    contents = addMissingImports(contents, importsToAdd);

    const onCreateBodyRegex =
      /override\s+fun\s+onCreate\s*\(\s*[^)]*Bundle\?\s*[^)]*\)\s*\{([\s\S]*?)\n\s*\}/;

    const injectedBlock = `
    if (Build.VERSION.SDK_INT >= 35) {
      val rootView = findViewById<View>(android.R.id.content)
      ViewCompat.setOnApplyWindowInsetsListener(rootView) { _, insets ->
        val imeInsets = insets.getInsets(WindowInsetsCompat.Type.ime())
        rootView.setPadding(
          imeInsets.left,
          imeInsets.top,
          imeInsets.right,
          imeInsets.bottom
        )
        insets
      }
    }
`.trim();

    if (onCreateBodyRegex.test(contents)) {
      contents = contents.replace(onCreateBodyRegex, (match, body) =>
        match.replace(body, `${body}\n\n${injectedBlock}\n`)
      );
    } else {
      contents = contents.replace(
        /(class\s+MainActivity\s*:\s*ReactActivity[^{]*\{)/,
        `$1

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(null)

${injectedBlock.split('\n').map((l) => '    ' + l).join('\n')}
  }
`
      );
    }

    config.modResults.contents = contents;
    return config;
  });
};
