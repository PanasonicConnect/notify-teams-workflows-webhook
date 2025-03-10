# Notify teams workflows webhook

[![GitHub Super-Linter](https://github.com/actions/javascript-action/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/actions/javascript-action/actions/workflows/ci.yml/badge.svg) ![Coverage](./badges/coverage.svg)

[English](./README-en.md)

このアクションは、指定されたTeamsのworkflowsで作成したWebhook URLにPOSTリクエストを送信します。その際、デフォルトでは以下の要素を含むJSONデータを送信します。

- body
  - ワークフロー番号
  - 最終コミットのメッセージ
  - 最終コミットの変更ファイル
  - リポジトリ名
  - ブランチ名
  - ワークフロー名
- actions
  - GitHubのワークフロー画面に遷移するボタン

デフォルトの表示内容を変更したり、ユーザーが作成したテンプレートファイルを元に送信内容をカスタマイズすることもできます。

## What's new

T.B.D

## Usage

### Workflows

```yaml
- uses: actions/checkout@v4
  with:
    # 変更ファイルを表示する際は必ずfetch-depthを0または1より大きい値にしてください
    fetch-depth: 2
- uses: PanasonicConnect/notify-teams-workflows-webhook
  with:
    # Teamsの通知先チャネルのWorkflows Webhook URLを指定してください
    webhook-url: ${{ secrets.TEST_WEBHOOK_URL }}
    # 送信内容のテンプレートファイル(.json)を使用する場合はパスを指定してください
    # default: 指定なし
    # example: .github/config/notify-template.json
    template: ''
    # 送信設定ファイル(.json)を使用する場合はパスを指定してください
    # default: 指定なし
    # example: .github/config/notify-config.json
    config: ''
    # カスタムメッセージ1を送信する場合は以下のパラメータを指定してください
    # default: 指定なし
    message1: ''
    # カスタムメッセージ2を送信する場合は以下のパラメータを指定してください
    # default: 指定なし
    message2: ''
    # 通知メッセージに付与するアクションボタンのタイトルを指定してください
    # default: View Workflow
    # example: ['View Workflow', 'View Pages']
    action-titles: []
    # 通知メッセージに付与するアクションボタン押下時に遷移するURLを指定してください
    # default: 本アクションを実行したワークフロー実行履歴画面のURL
    # example: ['https://github-workflow-url', 'https://github-pages-url']
    action-urls: []
```

### Permission

```yaml
permissions:
  contents: read
```

### Template

Teams workflows webhook URLに送信するアダプティブカード形式のデータのうち、bodyとして送信するデータをテンプレートして定義することができます。

```json
{
  "attachments": [
    {
      "contentType": "application/vnd.microsoft.card.adaptive",
      "content": {
        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
        "type": "AdaptiveCard",
        "version": "1.2",
        "body": [], // templateパラメータで指定したファイルの内容、またはDefault template内容により自動生成されます
        "actions": [] // action-titles, action-urlsパラメータ指定内容により自動生成されます
      }
    }
  ]
}
```

#### Default template

templateパラメータを指定しない場合は下記テンプレートが使用されます。テンプレート内の`{`と`}`で囲まれた箇所が変数として扱われ、ワークフロー実行時の値に置換されて送信されます。

```json
[
  {
    "type": "TextBlock",
    "text": "{GITHUB_RUN_NUMBER} {COMMIT_MESSAGE}",
    "id": "Title",
    "spacing": "Medium",
    "size": "large",
    "weight": "Bolder",
    "color": "Accent"
  },
  {
    "type": "TextBlock",
    "text": "{CUSTOM_MESSAGE_1}",
    "separator": true,
    "wrap": true
  },
  {
    "type": "FactSet",
    "facts": [
      {
        "title": "Repository:",
        "value": "{GITHUB_REPOSITORY}"
      },
      {
        "title": "Branch:",
        "value": "{BRANCH}"
      },
      {
        "title": "Workflow:",
        "value": "{GITHUB_WORKFLOW}"
      },
      {
        "title": "Event:",
        "value": "{GITHUB_EVENT_NAME}"
      }
      {
        "title": "Actor:",
        "value": "{GITHUB_ACTOR}"
      }
      {
        "title": "SHA-1:",
        "value": "{GITHUB_SHA}"
      }
    ],
    "separator": true,
    "id": "acFactSet"
  },
  {
    "type": "TextBlock",
    "text": "{CUSTOM_MESSAGE_2}",
    "separator": true,
    "wrap": true
  },
  {
    "type": "TextBlock",
    "text": "**Changed files:**",
    "separator": true,
    "wrap": true
  },
  {
    "type": "TextBlock",
    "text": "{CHANGED_FILES}",
    "size": "small",
    "wrap": false
  }
]
```

#### Custom template

templateパラメータでは、ユーザーが作成したテンプレートファイルを指定することができます。テンプレート作成については[Microsoft Teams 向けアダプティブ カードの概要](https://learn.microsoft.com/ja-jp/power-automate/overview-adaptive-cards)
を参考にしてください。

```json
[
  {
    "type": "TextBlock",
    "text": "{COMMIT_MESSAGE}",
    "separator": true,
    "wrap": true
  },
  {
    "type": "TextBlock",
    "text": "{CHANGED_FILES}",
    "size": "small",
    "wrap": false
  }
]
```

#### Variables

テンプレートファイル内で使用可能な変数は以下の通りです。

| 変数名              | 説明                                       |
| ------------------- | ------------------------------------------ |
| {CUSTOM_MESSAGE_1}  | カスタムメッセージ1                        |
| {CUSTOM_MESSAGE_2}  | カスタムメッセージ2                        |
| {GITHUB_RUN_NUMBER} | ワークフロー実行番号                       |
| {COMMIT_MESSAGE}    | 最終コミットのメッセージの最初の行         |
| {GITHUB_SHA}        | 最終コミットのSHA-1値                      |
| {CHANGED_FILES}     | 最終コミットの変更ファイル                 |
| {AUTHOR}            | 最終コミットの著者                         |
| {GITHUB_REPOSITORY} | リポジトリ名                               |
| {BRANCH}            | ブランチ名                                 |
| {GITHUB_WORKFLOW}   | ワークフロー名                             |
| {GITHUB_EVENT_NAME} | ワークフローのトリガーとなったイベント名   |
| {GITHUB_ACTOR}      | ワークフローのトリガーを実行したユーザー名 |

### Configuration

configパラメータを指定することで、送信内容、条件のカスタマイズを行うことができます。以下json内のコメントは説明のために記載していますが、実際のjson内にコメントを記載することはできません。

```json
{
  // Default Templateの各項目を表示するかどうかを指定します
  "visible": {
    // {GITHUB_REPOSITORY}を含むBlockを表示するかどうかを指定します
    // default: true
    "repository_name": true,
    // {BRANCH}を含むBlockを表示するかどうかを指定します
    // default: true
    "branch_name": true,
    // {GITHUB_WORKFLOW}を含むBlockを表示するかどうかを指定します
    // default: true
    "workflow_name": true,
    // {GITHUB_EVENT_NAME}を含むBlockを表示するかどうかを指定します
    // default: false
    "event": false,
    // {GITHUB_ACTOR}を含むBlockを表示するかどうかを指定します
    // default: false
    "actor": false,
    // {GITHUB_SHA}を含むBlockを表示するかどうかを指定します
    // default: false
    "sha1": false,
    // {CHANGED_FILES}を含むBlockを表示するかどうかを指定します
    // default: true
    "changed_files": true
  },
  "notification": {
    // 特定のキーワードがコミットメッセージに含まれる場合に通知を無視するかどうかを指定します
    // default: false
    // example: ["ignore:", "typo:"]
    "ignoreKeywords": []
  },
  "changedFile": {
    // 表示する変更ファイルの最大数を指定します
    // default: 10
    "max": 10
  }
}
```

## Versioning

バージョン管理にはセマンティック・バージョニングを使用しています。 利用可能なバージョンについては、このリポジトリのタグを参照してください。

## [Contributing](./CONTRIBUTING.md)

## License

このプロジェクトのスクリプトとドキュメントは[MITライセンス](./LICENSE)でリリースされています。
あ