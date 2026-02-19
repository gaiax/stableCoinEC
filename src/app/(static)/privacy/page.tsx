import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'プライバシーポリシー - StableCoinEC',
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">プライバシーポリシー</h1>

      <div className="prose prose-gray max-w-none space-y-6 text-sm leading-relaxed">
        <p>
          StableCoinEC（以下「当サイト」といいます）は、お客様の個人情報の保護を重要な責務と
          考え、以下のプライバシーポリシーに基づき、適切な取り扱いおよび保護に努めます。
        </p>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">1. 収集する情報</h2>
          <p>当サイトでは、以下の情報を収集することがあります。</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>メールアドレス</li>
            <li>氏名</li>
            <li>電話番号</li>
            <li>配送先住所</li>
            <li>ウォレットアドレス（暗号資産取引に関連する公開アドレス）</li>
            <li>注文履歴・取引履歴</li>
            <li>アクセスログ、Cookie情報、端末情報</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">2. 情報の利用目的</h2>
          <p>収集した個人情報は、以下の目的で利用します。</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>商品の販売、配送、およびアフターサービスの提供</li>
            <li>暗号資産（JPYC）による決済処理の実行</li>
            <li>ユーザーアカウントの管理</li>
            <li>お問い合わせへの対応</li>
            <li>サービスの改善および新サービスの開発</li>
            <li>利用規約に違反する行為への対応</li>
            <li>法令に基づく対応</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">3. 情報の第三者提供</h2>
          <p>
            当サイトは、以下の場合を除き、お客様の個人情報を第三者に提供することはありません。
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>お客様の同意がある場合</li>
            <li>法令に基づく場合</li>
            <li>商品の配送など、サービス提供に必要な範囲で業務委託先に提供する場合</li>
            <li>
              ブロックチェーン上の取引記録（トランザクションハッシュ、ウォレットアドレス等）は
              その性質上公開されます
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">4. ブロックチェーンに関する注意事項</h2>
          <p>
            当サイトで行われる暗号資産取引はブロックチェーン（Polygon）上に記録されます。
            ブロックチェーン上のデータは改ざんや削除ができない性質を持っています。
            ウォレットアドレスおよびトランザクション情報はブロックチェーン上で公開されることを
            ご理解の上、サービスをご利用ください。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">5. Cookieの使用</h2>
          <p>
            当サイトでは、ユーザー認証およびサービスの利便性向上のためにCookieを使用しています。
            ブラウザの設定によりCookieを無効にすることも可能ですが、その場合一部の機能が
            ご利用いただけなくなることがあります。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">6. セキュリティ</h2>
          <p>
            当サイトは、個人情報への不正アクセス、紛失、破壊、改ざんおよび漏洩の防止のために、
            合理的なセキュリティ対策を講じています。パスワードはハッシュ化して保存し、
            通信はSSL/TLSにより暗号化しています。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">7. 個人情報の開示・訂正・削除</h2>
          <p>
            お客様は、当サイトが保有する自己の個人情報について、開示・訂正・削除を請求する
            ことができます。ご希望の場合は、当サイトのお問い合わせ窓口までご連絡ください。
            なお、ブロックチェーン上に記録された情報については削除できません。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">8. プライバシーポリシーの変更</h2>
          <p>
            当サイトは、必要に応じて本プライバシーポリシーを変更することがあります。
            変更後のプライバシーポリシーは、当サイトに掲載した時点から効力を生じるものとします。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">9. お問い合わせ</h2>
          <p>
            本ポリシーに関するお問い合わせは、当サイトのお問い合わせフォームよりご連絡ください。
          </p>
        </section>

        <p className="text-muted-foreground mt-8">制定日: 2026年2月19日</p>
      </div>
    </div>
  );
}
