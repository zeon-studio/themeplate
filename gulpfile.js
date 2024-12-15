"use strict";

import autoprefixer from "autoprefixer";
import bs from "browser-sync";
import { readFileSync } from "fs";
import gulp from "gulp";
import fileInclude from "gulp-file-include";
import comments from "gulp-header-comment";
import jshint from "gulp-jshint";
import postcss from "gulp-postcss";
import template from "gulp-template";
import gUtil from "gulp-util";
import wrapper from "gulp-wrapper";
import rimraf from "rimraf";
import * as dartSass from "sass";
import tailwindcss from "tailwindcss";
import through2 from "through2";

const theme = JSON.parse(readFileSync("./src/theme.json"));
const node_env = process.argv.slice(2)[0];
const headerComments = `WEBSITE: https://zeon.studio/
                        TWITTER: https://twitter.com/zeon_studio/
                        FACEBOOK: https://facebook.com/heyzeonstudio/
                        GITHUB: https://github.com/zeon-studio/`;

const path = {
  // source paths
  src: {
    theme: "src/theme.json",
    pages: "src/pages/*.html",
    partials: "src/partials/**/*.html",
    styles: "src/styles/*.scss",
    scripts: "src/scripts/*.js",
    plugins: "src/plugins/**/*",
    public: "src/public/**/*",
  },

  // build paths
  build: {
    dir: "theme/",
  },
};

// Styles task using native Sass compilation
function styles() {
  return gulp
    .src(path.src.styles)
    .pipe(
      through2.obj(function (file, enc, callback) {
        if (file.isBuffer()) {
          try {
            const result = dartSass.compileString(file.contents.toString(), {
              style: "expanded",
              loadPaths: ["src/styles"],
            });

            file.contents = Buffer.from(result.css);
            file.path = file.path.replace(".scss", ".css");
          } catch (error) {
            console.error("Sass compilation error:", error);
          }
        }
        this.push(file);
        callback();
      }),
    )
    .pipe(postcss([tailwindcss("./tailwind.config.js"), autoprefixer]))
    .pipe(comments(headerComments))
    .pipe(gulp.dest(path.build.dir + "styles/"))
    .pipe(
      bs.reload({
        stream: true,
      }),
    );
}

// pages
function pages() {
  return gulp
    .src(path.src.pages)
    .pipe(
      wrapper({
        header:
          "<!DOCTYPE html>\n<html lang=\"zxx\">\n@@include('head.html')\n@@include('header.html')\n<body>",
        footer:
          node_env === "dev"
            ? "@@include('components/tw-size-indicator.html')\n @@include('footer.html')\n</body>\n</html>"
            : "@@include('footer.html')\n</body>\n</html>",
      }),
    )
    .pipe(
      fileInclude({
        basepath: "src/partials/",
      }),
    )
    .pipe(
      template({
        fontPrimary: theme.fonts.font_family.primary,
        fontSecondary: theme.fonts.font_family.secondary,
      }),
    )
    .pipe(comments(headerComments))
    .pipe(gulp.dest(path.build.dir))
    .pipe(
      bs.reload({
        stream: true,
      }),
    );
}

// scripts
function scripts() {
  return gulp
    .src(path.src.scripts)
    .pipe(jshint("./.jshintrc"))
    .pipe(jshint.reporter("jshint-stylish"))
    .on("error", gUtil.log)
    .pipe(comments(headerComments))
    .pipe(gulp.dest(path.build.dir + "scripts/"))
    .pipe(
      bs.reload({
        stream: true,
      }),
    );
}

// Plugins
function plugins() {
  return gulp
    .src(path.src.plugins)
    .pipe(gulp.dest(path.build.dir + "plugins/"))
    .pipe(
      bs.reload({
        stream: true,
      }),
    );
}

// public files
function publicFiles() {
  return gulp
    .src(path.src.public, { encoding: false })
    .pipe(gulp.dest(path.build.dir));
}

// Clean Theme Folder
function clean(cb) {
  rimraf("./theme", cb);
}

// Watch Task
function watch() {
  gulp.watch(path.src.theme, gulp.parallel(styles));
  gulp.watch(path.src.pages, gulp.parallel(pages, styles));
  gulp.watch(path.src.partials, gulp.parallel(pages, styles));
  gulp.watch(path.src.scripts, gulp.parallel(scripts, styles));
  gulp.watch(path.src.styles, gulp.parallel(styles));
  gulp.watch(path.src.plugins, gulp.parallel(plugins, pages));
  gulp.watch(path.src.public, gulp.parallel(publicFiles, pages));
}

// dev Task
const dev = gulp.series(
  clean,
  pages,
  styles,
  scripts,
  plugins,
  publicFiles,
  gulp.parallel(watch, () => {
    bs.init({
      server: {
        baseDir: path.build.dir,
      },
    });
  }),
);

// Build Task
const build = gulp.series(clean, pages, styles, scripts, plugins, publicFiles);

// Deploy Task
const deploy = gulp.series(pages, styles, scripts, plugins, publicFiles);

export {
  build,
  clean,
  deploy,
  dev,
  pages,
  plugins,
  publicFiles,
  scripts,
  styles,
  watch,
};

export default dev;
