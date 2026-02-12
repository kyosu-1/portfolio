---
title: ecspressoライクなAWS Batchデプロイツール「batcha」を作った
date: "2025-02-12"
tags: [Go, AWS, OSS]
summary: AWS Batch Job Definitionを宣言的に管理・デプロイするCLIツールを作りました。
---

# ecspressoライクなAWS Batchデプロイツール「batcha」を作った

AWS Batch の Job Definition をコードで管理・デプロイするCLIツール **batcha** を作りました。

GitHub: [kyosu-1/batcha](https://github.com/kyosu-1/batcha)

## モチベーション

ECS はサービスとタスク定義を中心にデプロイを管理します。一方 AWS Batch は、ジョブキューとコンピュート環境を使ったバッチ処理の実行基盤で、管理の中心は Job Definition とジョブキューになります。AWS Batch はコンテナの実行基盤に ECS や EKS を利用するジョブスケジューリングサービスですが、デプロイの単位や運用の流れは異なります。

ECS には [@fujiwara](https://github.com/fujiwara) さん作の [ecspresso](https://github.com/kayac/ecspresso) という優れたデプロイツールがあります。サービスやタスク定義を JSON で宣言的に管理し、差分検出・Terraform 連携・デプロイ/ロールバックといった運用に必要な機能をひと通り備えたツールです。

AWS Batch にはこういったいい感じのデプロイツールがなかったので、ecspresso の設計思想やインタフェースを参考にして作りました。テンプレートエンジンに [kayac/go-config](https://github.com/kayac/go-config)、Terraform state の参照に [fujiwara/tfstate-lookup](https://github.com/fujiwara/tfstate-lookup) を利用しており、ecspresso と同じエコシステムの上に構築しています。

ecspresso と同様に、変更頻度の高い Job Definition の管理に特化し、ジョブキューやコンピュート環境、ネットワークといった頻繁には変わらないリソースは Terraform などの IaC ツールに任せる設計です。

ただ、ECS と違って Service の概念がなく、やることは基本的に Job Definition の register と run だけなので、ecspresso よりだいぶシンプルなツールになっています。
名前の由来は抹茶（matcha）です。ecspresso がエスプレッソなので、こちらもコーヒー屋の流れで。**Bat**ch + mat**cha** = **batcha** です。

## 特徴

ecspresso の主要機能に対応する形で、AWS Batch 向けの機能を実装しています。

| ecspresso (ECS) | batcha (AWS Batch) |
|---|---|
| タスク定義を JSON テンプレートで管理 | Job Definition を JSON テンプレートで管理 |
| `ecspresso register` でタスク定義登録 | `batcha register` で Job Definition 登録 |
| `ecspresso diff` で差分検出 | `batcha diff` で差分検出 |
| `ecspresso verify` でローカル検証 | `batcha verify` でローカル検証 |
| `ecspresso init` で既存リソースから生成 | `batcha init` で既存定義から生成 |
| `ecspresso run` でタスク実行 | `batcha run` でジョブ実行 |
| tfstate プラグインで Terraform 連携 | 同様に tfstate プラグインで連携 |

### Job Definition の登録

`batcha register` で Job Definition を AWS Batch に登録します。リモートとの差分がなければ登録をスキップするため、不要なリビジョンが増えません。

```bash
batcha register --config batcha.yml
```

### 宣言的な Job Definition 管理

ecspresso と同様に、定義を JSON テンプレートで管理します。テンプレート内で環境変数や Terraform の state を参照できます。

```json
{
  "jobDefinitionName": "my-job",
  "type": "container",
  "containerProperties": {
    "image": "{{ tfstate \"aws_ecr_repository.app.repository_url\" }}:{{ env \"IMAGE_TAG\" \"latest\" }}",
    "resourceRequirements": [
      { "type": "VCPU", "value": "0.25" },
      { "type": "MEMORY", "value": "512" }
    ]
  }
}
```

### 差分検出

ecspresso の `diff` と同じく、リモートとローカルの差分を確認してからデプロイできます。

```bash
batcha diff --config batcha.yml
```

### Terraform 連携

前述の tfstate-lookup を使っており、S3・GCS・Terraform Cloud など主要なバックエンドに対応しています。

```yaml
# batcha.yml
region: ap-northeast-1
job_definition: job-definition.json
plugins:
  - name: tfstate
    config:
      url: s3://my-bucket/terraform.tfstate
```

### ジョブの実行・ログ確認

ecspresso の `run` / `logs` に対応する機能です。ジョブの実行と CloudWatch Logs の取得をサポートしています。

```bash
# ジョブを実行して完了を待つ（--job-queue または config の job_queue で指定）
batcha run --config batcha.yml --job-queue my-queue --wait

# CloudWatch Logsをフォロー
batcha logs --config batcha.yml --follow
```

### ローカルバリデーション

ecspresso の `verify` と同様に、AWS API を呼ばずにテンプレートと構造を検証できます。Fargate のリソース制約（vCPU/メモリの組み合わせ）もチェックします。

```bash
batcha verify --config batcha.yml
```

## クイックスタート

Homebrew でインストールできます。

```bash
brew install kyosu-1/tap/batcha
```

既存の Job Definition からセットアップを始められます。

```bash
# 既存の定義からconfig + テンプレートを生成
batcha init --job-definition-name my-job

# 差分を確認
batcha diff --config batcha.yml

# デプロイ
batcha register --config batcha.yml
```

## GitHub Actions

GitHub Actions 用のアクションも用意しており、CI/CD の中でイメージタグの更新から Job Definition の登録まで完結できます。

```yaml
- uses: kyosu-1/batcha@v0
  with:
    args: "register --config batcha.yml"
  env:
    IMAGE_TAG: ${{ github.sha }}
```

## おわりに

batcha のコードはほぼ Claude Code が書いたもので、自分は設計の方向付けと調整に徹しました。ecspresso という優れた手本があったのも大きいですが、こういうツールがサクッと作れてしまう、いい時代になりましたね。
