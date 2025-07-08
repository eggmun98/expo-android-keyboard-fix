const { withMainActivity } = require('@expo/config-plugins');

module.exports = function withAndroidKeyboardFix(config) {
  return withMainActivity(config, (config) => {
    let mainActivity = config.modResults.contents;

    if (!mainActivity.includes('WindowInsetsCompat.Type.ime()')) {
      const isKotlin = mainActivity.includes('class MainActivity : ReactActivity');

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
  }`;

      const replacementCodeJava = `
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    if (Build.VERSION.SDK_INT >= 35) {
      View rootView = findViewById(android.R.id.content);
      ViewCompat.setOnApplyWindowInsetsListener(rootView, (v, insets) -> {
        WindowInsetsCompat.Insets imeInsets = insets.getInsets(WindowInsetsCompat.Type.ime());
        rootView.setPadding(
          imeInsets.left,
          imeInsets.top,
          imeInsets.right,
          imeInsets.bottom
        );
        return insets;
      });
    }
  }`;

      const importsToAddKotlin = [
        'android.os.Build',
        'android.view.View',
        'androidx.core.view.ViewCompat',
        'androidx.core.view.WindowInsetsCompat',
      ];

      const importsToAddJava = [
        'android.os.Build;',
        'android.view.View;',
        'androidx.core.view.ViewCompat;',
        'androidx.core.view.WindowInsetsCompat;',
      ];

      const addMissingImports = (contents, imports, isKotlin) => {
        const lines = contents.split('\n');
        const existingImports = new Set(
          lines
            .filter((line) => line.trim().startsWith('import '))
            .map((line) => line.trim().replace('import ', '').replace(';', '')),
        );

        const missingImports = imports.filter((importStmt) => !existingImports.has(importStmt.replace(';', '')));

        if (missingImports.length === 0) {
          return contents;
        }

        const importBlock = missingImports.map((stmt) => `import ${stmt}${isKotlin ? '' : ';'}`).join('\n');

        return contents.replace(/(package [^\n;]+[;\n])/, `$1\n${importBlock}\n`);
      };

      if (isKotlin) {
        mainActivity = addMissingImports(mainActivity, importsToAddKotlin, true);
        mainActivity = mainActivity.replace(
          /override fun onCreate\([^)]*\)[^{]*{[\s\S]*?super\.onCreate\([^)]*\)\s*}/,
          replacementCodeKotlin,
        );
      } else {
        mainActivity = addMissingImports(mainActivity, importsToAddJava, false);
        mainActivity = mainActivity.replace(
          /public class MainActivity extends ReactActivity \{/,
          `public class MainActivity extends ReactActivity {${replacementCodeJava}`,
        );
      }

      config.modResults.contents = mainActivity;
    }

    return config;
  });
};
