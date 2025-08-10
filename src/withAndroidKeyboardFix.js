const { withMainActivity } = require('@expo/config-plugins');

module.exports = function withAndroidKeyboardFix(config) {
  return withMainActivity(config, (config) => {
    let contents = config.modResults.contents;

    if (contents.includes('WindowInsetsCompat.Type.ime()')) {
      return config;
    }

    const isKotlin = contents.includes('class MainActivity : ReactActivity');
    if (!isKotlin) {
      return config;
    }

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
          .map((l) => l.trim().replace('import ', '').replace(';', '')),
      );
      const missing = imports.filter((imp) => !existing.has(imp));
      if (missing.length === 0) return src;

      const block = missing.map((imp) => `import ${imp}`).join('\n');
      return src.replace(/(package [^\n;]+[;\n])/, `$1\n${block}\n`);
    };

    const replacementCodeKotlin = `
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(null)

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
  }`.trim();

    contents = addMissingImports(contents, importsToAdd);

    const onCreateRegex =
      /override\s+fun\s+onCreate\s*\([^)]*\)\s*\{[\s\S]*?\n\s*\}/;

    if (onCreateRegex.test(contents)) {
      contents = contents.replace(onCreateRegex, replacementCodeKotlin);
    } else {
      contents = contents.replace(
        /(class\s+MainActivity\s*:\s*ReactActivity[^{]*\{)([\s\S]*?)(\n\})/,
        (_m, start, body, endBrace) =>
          `${start}${body}\n\n  ${replacementCodeKotlin.split('\n').join('\n  ')}${endBrace}`,
      );
    }

    config.modResults.contents = contents;
    return config;
  });
};
