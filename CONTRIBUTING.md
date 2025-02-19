# Contributing

---

## 日本語

### Pull Requests

1. リポジトリをfolkしてクローンしてください。
1. `npm install`を実行してパッケージをインストールしてください
1. [`src/`](./src/)以下のコードを修正してください。GitHub Actions toolkitの詳細については
   [documentation](https://github.com/actions/toolkit/blob/main/README.md) を確認してください。
1. [`__tests__/`](./__tests__)にテストを追加してください。
1. `npm run test` でテストを実行して成功することを確認してください。
1. `npm run all` でJavaScriptをパッケージ化し、テストとビルドが成功することを確認してください。
1. 変更内容をリポジトリにプッシュし、プルリクエストを提出してください。
1. プルリクエストがレビューされ、マージされるのを待ってください。

!!! note Node.jsのバージョンは20.x以上を使用してください。

Pull Requestが受け入れられる可能性を高めるためにできること:

- できるだけ必要名テストを書いてください。
- 変更をできるだけ焦点を絞ってください。依存関係のない複数の変更を行う場合は、別々のプルリクエストとして提出することを検討してください。

---

## English

### Pull Requests

1. folk and clone the repository.
1. run `npm install` to install the package
1. modify the code under [`src/`](./src/) and modify the code below. Check [documentation](https://github.com/actions/toolkit/blob/main/README.md) for more
   information about GitHub Actions toolkit. 1.
1. modify [`__tests__/`](./__tests__). 1. Run the tests with `npm run test` and make sure they succeed. 1.
1. package JavaScript with `npm run all` and make sure the tests and build succeed.
1. Push to your fork and submit a pull request
1. Pat yourself on the back and wait for your pull request to be reviewed and merged

!!!! note Please use Node.js version 20.x or higher.

Here are a few things you can do that will increase the likelihood of your pull request being accepted:

- Write tests.
- Keep your change as focused as possible. If there are multiple changes you would like to make that are not dependent upon each other, consider submitting them
  as separate pull request
