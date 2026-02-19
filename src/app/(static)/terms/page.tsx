import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '利用規約 - StableCoinEC',
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">利用規約</h1>

      <div className="prose prose-gray max-w-none space-y-6 text-sm leading-relaxed">
        <p>
          この利用規約（以下「本規約」といいます）は、StableCoinEC（以下「当サイト」といいます）
          が提供するECサービス（以下「本サービス」といいます）の利用条件を定めるものです。
          ユーザーの皆様には、本規約に同意の上、本サービスをご利用いただきます。
        </p>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">第1条（適用）</h2>
          <ol className="list-decimal list-inside space-y-1 ml-4">
            <li>本規約は、ユーザーと当サイト運営者との間の本サービスの利用に関わる一切の関係に適用されます。</li>
            <li>当サイト運営者が本サービス上で掲載するルールや注意事項等は、本規約の一部を構成するものとします。</li>
          </ol>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">第2条（ユーザー登録）</h2>
          <ol className="list-decimal list-inside space-y-1 ml-4">
            <li>本サービスの利用を希望する者は、本規約に同意の上、所定の方法によりユーザー登録を行うものとします。</li>
            <li>当サイト運営者は、登録申請者に以下の事由があると判断した場合、登録を拒否することがあります。
              <ul className="list-disc list-inside ml-6 mt-1">
                <li>虚偽の情報を届け出た場合</li>
                <li>本規約に違反したことがある者からの申請である場合</li>
                <li>その他、登録が適切でないと判断した場合</li>
              </ul>
            </li>
          </ol>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">第3条（決済について）</h2>
          <ol className="list-decimal list-inside space-y-1 ml-4">
            <li>本サービスにおける商品の決済は、JPYC（暗号資産）を使用して行われます。</li>
            <li>ユーザーは、暗号資産ウォレット（MetaMask等）を接続し、Polygon ネットワーク上でJPYCによる支払いを行います。</li>
            <li>ブロックチェーン上で確認（confirm）された取引は、取り消し・返金が技術的に困難な場合があることをユーザーは理解し、同意するものとします。</li>
            <li>ネットワーク手数料（ガス代）はユーザーの負担とします。</li>
          </ol>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">第4条（売上分配）</h2>
          <ol className="list-decimal list-inside space-y-1 ml-4">
            <li>本サービスでは、スマートコントラクトにより、決済完了時に売上が自動的に分配されます。</li>
            <li>分配比率は、出品者が商品登録時に設定するものとし、設定後の変更はスマートコントラクトの仕様に従います。</li>
          </ol>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">第5条（禁止事項）</h2>
          <p>ユーザーは、本サービスの利用にあたり、以下の行為を行ってはなりません。</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>法令または公序良俗に違反する行為</li>
            <li>犯罪行為に関連する行為</li>
            <li>マネーロンダリングや詐欺等の不正行為</li>
            <li>当サイトのサーバーやネットワークの機能を妨害する行為</li>
            <li>スマートコントラクトの脆弱性を悪用する行為</li>
            <li>他のユーザーに対する迷惑行為</li>
            <li>他者の個人情報やウォレット情報を不正に取得する行為</li>
            <li>当サイト運営者のサービスの運営を妨害する行為</li>
            <li>その他、当サイト運営者が不適切と判断する行為</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">第6条（本サービスの提供の停止等）</h2>
          <p>
            当サイト運営者は、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく
            本サービスの全部または一部の提供を停止または中断することができるものとします。
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>本サービスにかかるシステムの保守・更新を行う場合</li>
            <li>ブロックチェーンネットワークの障害、混雑、ハードフォーク等が発生した場合</li>
            <li>地震、落雷、火災、停電等の不可抗力により本サービスの提供が困難となった場合</li>
            <li>その他、当サイト運営者が本サービスの提供が困難と判断した場合</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">第7条（免責事項）</h2>
          <ol className="list-decimal list-inside space-y-1 ml-4">
            <li>当サイト運営者は、本サービスに事実上または法律上の瑕疵がないことを保証するものではありません。</li>
            <li>ブロックチェーンの特性に起因する損害（トランザクションの遅延、失敗、ガス代の変動等）について、当サイト運営者は一切の責任を負いません。</li>
            <li>暗号資産の価格変動に起因する損害について、当サイト運営者は一切の責任を負いません。</li>
            <li>ユーザーの秘密鍵やウォレットの管理不備に起因する損害について、当サイト運営者は一切の責任を負いません。</li>
          </ol>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">第8条（サービス内容の変更等）</h2>
          <p>
            当サイト運営者は、ユーザーに通知することなく、本サービスの内容を変更し、または本サービスの
            提供を中止することができるものとし、これによってユーザーに生じた損害について一切の責任を
            負いません。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">第9条（利用規約の変更）</h2>
          <p>
            当サイト運営者は、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更する
            ことができるものとします。変更後の本規約は、当サイトに掲載された時点から効力を生じるものと
            します。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">第10条（準拠法・裁判管轄）</h2>
          <ol className="list-decimal list-inside space-y-1 ml-4">
            <li>本規約の解釈にあたっては、日本法を準拠法とします。</li>
            <li>本サービスに関して紛争が生じた場合には、当サイト運営者の所在地を管轄する裁判所を専属的合意管轄とします。</li>
          </ol>
        </section>

        <p className="text-muted-foreground mt-8">制定日: 2026年2月19日</p>
      </div>
    </div>
  );
}
