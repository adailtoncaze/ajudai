import type { ReactElement } from "react";
import { brl } from "./format";
import type { ConfigCard } from "./share-card";

type Props = {
  titulo: string;
  descricao: string;
  imagem: string | null;
  premioTitulo: string | null;
  premioImagem: string | null;
  precoCents: number;
  config: ConfigCard;
};

const COR = {
  fundo: "#FFF1EC",
  superficie: "#FFFFFF",
  titulo: "#321C0F",
  texto: "#75543F",
  laranja: "#B23514",
  laranjaVivo: "#F04E23",
  verde: "#1B744E",
};

function Imagem({
  src,
  largura,
  altura,
  raio,
  legenda,
  tamanhoLegenda,
}: {
  src: string | null;
  largura: number;
  altura: number;
  raio: number;
  legenda: string;
  tamanhoLegenda: number;
}) {
  if (src) {
    return (
      // O gerador de imagens do Next (Satori) aceita object-fit e busca a URL no servidor.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={largura}
        height={altura}
        style={{ width: largura, height: altura, objectFit: "cover", borderRadius: raio }}
      />
    );
  }

  return (
    <div
      style={{
        width: largura,
        height: altura,
        borderRadius: raio,
        backgroundColor: COR.laranjaVivo,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          color: COR.superficie,
          fontSize: tamanhoLegenda,
          fontWeight: 800,
          letterSpacing: 4,
        }}
      >
        {legenda}
      </div>
    </div>
  );
}

function Selo({ fontSize }: { fontSize: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <div
        style={{
          width: fontSize * 0.8,
          height: fontSize * 0.8,
          borderRadius: fontSize * 0.2,
          backgroundColor: COR.laranjaVivo,
          marginRight: 14,
        }}
      />
      <div
        style={{
          color: COR.laranja,
          fontSize,
          fontWeight: 800,
          letterSpacing: 3,
        }}
      >
        RIFA SOLIDÁRIA
      </div>
    </div>
  );
}

function Premio({
  titulo,
  imagem,
  vertical,
  tamanhoImagem,
}: {
  titulo: string | null;
  imagem: string | null;
  vertical: boolean;
  tamanhoImagem: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        backgroundColor: COR.superficie,
        borderRadius: vertical ? 24 : 20,
        padding: vertical ? 18 : 14,
        width: "100%",
      }}
    >
      <div style={{ display: "flex", marginRight: vertical ? 20 : 16 }}>
        <Imagem
          src={imagem}
          largura={tamanhoImagem}
          altura={tamanhoImagem}
          raio={vertical ? 18 : 12}
          legenda="PRÊMIO"
          tamanhoLegenda={vertical ? 18 : 12}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            color: COR.verde,
            fontSize: vertical ? 22 : 17,
            fontWeight: 800,
            letterSpacing: 3,
          }}
        >
          PRÊMIO
        </div>
        <div
          style={{
            color: COR.titulo,
            fontSize: vertical ? 30 : 25,
            fontWeight: 800,
            marginTop: 6,
          }}
        >
          {titulo ?? "Prêmio da rifa"}
        </div>
      </div>
    </div>
  );
}

/** Tag de preço: só o valor, em cor de destaque com moldura clara. */
function Preco({ precoCents, vertical }: { precoCents: number; vertical: boolean }) {
  // O Satori exige um único nó de texto por div (ou display: flex explícito).
  const texto = brl(precoCents);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        alignSelf: "flex-start",
        backgroundColor: COR.laranjaVivo,
        border: `4px solid ${COR.superficie}`,
        borderRadius: 999,
        padding: vertical ? "18px 34px" : "14px 28px",
      }}
    >
      <div
        style={{
          color: COR.superficie,
          fontSize: vertical ? 44 : 34,
          fontWeight: 800,
          letterSpacing: 1,
        }}
      >
        {texto}
      </div>
    </div>
  );
}

function CardHorizontal({
  titulo,
  descricao,
  imagem,
  premioTitulo,
  premioImagem,
  precoCents,
  config,
}: Props) {
  return (
    <div
      style={{
        width: config.largura,
        height: config.altura,
        display: "flex",
        backgroundColor: COR.fundo,
        overflow: "hidden",
      }}
    >
      <Imagem
        src={imagem}
        largura={440}
        altura={config.altura}
        raio={0}
        legenda="RIFA"
        tamanhoLegenda={84}
      />
      <div style={{ width: 12, height: config.altura, backgroundColor: COR.laranjaVivo }} />
      <div
        style={{
          width: config.largura - 452,
          height: config.altura,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "48px 44px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <Selo fontSize={22} />
          <div
            style={{
              color: COR.titulo,
              fontSize: 42,
              lineHeight: 1.08,
              fontWeight: 800,
              marginTop: 18,
            }}
          >
            {titulo}
          </div>
          {descricao && (
            <div
              style={{
                color: COR.texto,
                fontSize: 21,
                lineHeight: 1.35,
                marginTop: 14,
              }}
            >
              {descricao}
            </div>
          )}
          <div style={{ display: "flex", marginTop: 22 }}>
            <Premio
              titulo={premioTitulo}
              imagem={premioImagem}
              vertical={false}
              tamanhoImagem={config.premioImagemTamanho}
            />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <Preco precoCents={precoCents} vertical={false} />
          <div style={{ color: COR.laranja, fontSize: 21, fontWeight: 800, marginTop: 12 }}>
            {config.rotulo}
          </div>
        </div>
      </div>
    </div>
  );
}

function CardVertical({
  titulo,
  descricao,
  imagem,
  premioTitulo,
  premioImagem,
  precoCents,
  config,
}: Props) {
  return (
    <div
      style={{
        width: config.largura,
        height: config.altura,
        display: "flex",
        position: "relative",
        backgroundColor: COR.fundo,
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", position: "absolute", top: 0, left: 0 }}>
        <Imagem
          src={imagem}
          largura={config.largura}
          altura={config.alturaImagem}
          raio={0}
          legenda="RIFA"
          tamanhoLegenda={110}
        />
      </div>
      <div
        style={{
          position: "absolute",
          top: config.alturaImagem - 84,
          left: 0,
          width: config.largura,
          height: 84,
          backgroundColor: COR.laranja,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: COR.superficie,
          fontSize: 30,
          fontWeight: 800,
          letterSpacing: 5,
        }}
      >
        RIFA SOLIDÁRIA
      </div>

      <div
        style={{
          position: "absolute",
          top: config.alturaImagem + 40,
          left: 68,
          width: config.largura - 136,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ color: COR.laranja, fontSize: 24, fontWeight: 800, letterSpacing: 4 }}>
          RIFA BENEFICENTE
        </div>
        <div
          style={{
            color: COR.titulo,
            fontSize: 52,
            lineHeight: 1.08,
            fontWeight: 800,
            marginTop: 16,
          }}
        >
          {titulo}
        </div>
        {descricao && (
          <div
            style={{
              color: COR.texto,
              fontSize: config.descricaoFonte,
              lineHeight: 1.34,
              marginTop: 18,
            }}
          >
            {descricao}
          </div>
        )}
        <div style={{ display: "flex", marginTop: 28 }}>
          <Premio
            titulo={premioTitulo}
            imagem={premioImagem}
            vertical
            tamanhoImagem={config.premioImagemTamanho}
          />
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 40,
          left: 68,
          width: config.largura - 136,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Preco precoCents={precoCents} vertical />
        <div style={{ color: COR.laranja, fontSize: 25, fontWeight: 800, marginTop: 14 }}>
          {config.rotulo}
        </div>
      </div>
    </div>
  );
}

/** Elemento JSX usado pelo ImageResponse. Sem Tailwind: Satori aceita só um subconjunto de CSS. */
export function elementoCard(dados: Props): ReactElement {
  return dados.config.vertical ? <CardVertical {...dados} /> : <CardHorizontal {...dados} />;
}
