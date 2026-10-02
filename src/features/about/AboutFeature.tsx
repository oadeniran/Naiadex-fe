import styles from "./about.module.css";

export default function AboutFeature() {
  return (
    <div className={styles.about}>
      <section className={styles.hero}>
        <h1 className={styles.title}>Naiadex</h1>
        <p className={styles.lede}>
          A citizen-science companion for urban streams — identify the life in them, assess their
          health with AI, and build a shared picture of the waterways around us.
        </p>
      </section>

      <section className={styles.block}>
        <h2>Why streams?</h2>
        <p>
          Urban streams are everywhere, often hidden in culverts and valleys between city blocks.
          They shape air quality, temperature, flood risk, and biodiversity — and their condition
          is a signal of the wider environment&rsquo;s health. Naiadex follows the{" "}
          <strong>One Health</strong> idea: the health of people, other organisms, and the
          environment are one interconnected system, and a healthy stream is a sign of all three.
        </p>
      </section>

      <section className={styles.block}>
        <h2>How it works</h2>
        <div className={styles.cards}>
          <div className={styles.card}>
            <h3>Identify</h3>
            <p>
              Photograph any stream organism — a fish, insect, plant, or alga — and AI proposes an
              identification. You confirm or correct it, and the community can suggest and discuss,
              so each find becomes a verified record, not just a guess.
            </p>
          </div>
          <div className={styles.card}>
            <h3>Assess</h3>
            <p>
              Photograph a stream and its surroundings. AI works through a structured ecological
              rubric in the background — channel, banks, water, vegetation, pressures — telling you
              what it can see and flagging what it can&rsquo;t. You review and confirm the findings.
            </p>
          </div>
          <div className={styles.card}>
            <h3>Explore</h3>
            <p>
              Browse finalized assessments and discoveries shared by everyone, on a map and in a
              feed, each with a plain-language summary of what the stream&rsquo;s health looks like.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.block}>
        <h2>AI with a human in the loop</h2>
        <p>
          AI does the heavy lifting — comparing your photos against ecological references and
          drafting assessments — but it never has the final say. It shows its reasoning and
          confidence, declines to guess when a photo can&rsquo;t support an answer, and hands every
          judgement to a person to confirm. The result is faster citizen science that stays
          trustworthy.
        </p>
      </section>

      <p className={styles.footer}>
        Built on the OneAquaHealth vision of connecting ecosystem health, biodiversity, and human
        well-being.
      </p>
    </div>
  );
}