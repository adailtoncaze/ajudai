import type { ReactElement } from "react";
import { brl } from "./format";
import { dataParaCard, type ConfigCard } from "./share-card";

type Props = {
  titulo: string;
  descricao: string;
  imagem: string | null;
  premioTitulo: string | null;
  premioImagem: string | null;
  precoCents: number;
  /** Data prevista do sorteio (`AAAA-MM-DD`), exibida ao lado do valor. */
  drawDate: string | null;
  config: ConfigCard;
};

const COR = {
  fundo: "#FFF1EC",
  superficie: "#FFFFFF",
  superficieMuda: "#E9EDF1",
  titulo: "#321C0F",
  texto: "#75543F",
  textoSuave: "#7E604A",
  laranja: "#B23514",
  laranjaForte: "#D6411A",
  laranjaVivo: "#F04E23",
  verde: "#1B744E",
  linha: "#7C8791",
  borda: "#DCE1E6",
};

// Preço e data precisam ter exatamente a mesma altura para ficarem alinhados.
const ALTURA_VALOR = { vertical: 98, horizontal: 78 } as const;

// Números da cartela da home, usados na borda inferior do card.
// Mantém as quatro semânticas da grade pública (livre, selecionado, reservado, pago).
const NUMEROS_CARTELA = [
  { valor: "07", estado: "pago" },
  { valor: "12", estado: "selecionado" },
  { valor: "18", estado: "livre" },
  { valor: "23", estado: "livre" },
  { valor: "31", estado: "reservado" },
  { valor: "42", estado: "livre" },
  { valor: "56", estado: "pago" },
  { valor: "63", estado: "livre" },
  { valor: "78", estado: "livre" },
  { valor: "85", estado: "reservado" },
  { valor: "91", estado: "livre" },
  { valor: "99", estado: "livre" },
] as const;

const ESTILOS_NUMERO = {
  livre: { fundo: COR.superficie, borda: COR.linha, texto: COR.titulo },
  selecionado: { fundo: COR.laranjaForte, borda: COR.laranjaForte, texto: COR.superficie },
  reservado: { fundo: COR.superficieMuda, borda: COR.linha, texto: COR.textoSuave },
  pago: { fundo: COR.verde, borda: COR.verde, texto: COR.superficie },
} as const;

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
        justifyContent: "center",
        alignSelf: "flex-start",
        boxSizing: "border-box",
        height: vertical ? ALTURA_VALOR.vertical : ALTURA_VALOR.horizontal,
        backgroundColor: COR.laranjaVivo,
        border: `4px solid ${COR.superficie}`,
        borderRadius: 999,
        padding: vertical ? "0 34px" : "0 28px",
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
  drawDate,
  config,
}: Props) {
  const data = dataParaCard(drawDate);
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
          height: config.altura - config.bordaCartela.altura,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "40px 44px 24px",
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
          <RodapeValor precoCents={precoCents} data={data} vertical={false} />
          <div style={{ color: COR.laranja, fontSize: 21, fontWeight: 800, marginTop: 12 }}>
            {config.rotulo}
          </div>
        </div>
      </div>
      <BordaCartela config={config} />
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
  drawDate,
  config,
}: Props) {
  const data = dataParaCard(drawDate);
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
          bottom: config.bordaCartela.altura + 40,
          left: 68,
          width: config.largura - 136,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <RodapeValor precoCents={precoCents} data={data} vertical />
        <div style={{ color: COR.laranja, fontSize: 25, fontWeight: 800, marginTop: 14 }}>
          {config.rotulo}
        </div>
      </div>
      <BordaCartela config={config} />
    </div>
  );
}

/** Rodapé com o valor à esquerda e a data do sorteio à direita, na mesma linha e altura. */
function RodapeValor({
  precoCents,
  data,
  vertical,
}: {
  precoCents: number;
  data: string | null;
  vertical: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Preco precoCents={precoCents} vertical={vertical} />
      {data && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxSizing: "border-box",
            height: vertical ? ALTURA_VALOR.vertical : ALTURA_VALOR.horizontal,
            backgroundColor: COR.verde,
            border: `4px solid ${COR.superficie}`,
            borderRadius: 999,
            padding: vertical ? "0 32px" : "0 24px",
          }}
        >
          <div
            style={{
              color: COR.superficie,
              fontSize: vertical ? 40 : 28,
              fontWeight: 800,
              letterSpacing: 1,
            }}
          >
            {`Sorteio ${data}`}
          </div>
        </div>
      )}
    </div>
  );
}

/** Borda inferior discreta com uma linha de números da cartela da home. */
function BordaCartela({ config }: { config: ConfigCard }) {
  const { altura, tamanhoNumero, fonteNumero, opacidade } = config.bordaCartela;

  return (
    <div
      style={{
        display: "flex",
        position: "absolute",
        bottom: 0,
        left: 0,
        width: config.largura,
        height: altura,
        boxSizing: "border-box",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COR.superficie,
        borderTop: `2px solid ${COR.borda}`,
        opacity: opacidade,
      }}
    >
      <div style={{ display: "flex" }}>
        {NUMEROS_CARTELA.map((numero, indice) => {
          const estilo = ESTILOS_NUMERO[numero.estado];
          return (
            <div
              key={numero.valor}
              style={{
                width: tamanhoNumero,
                height: tamanhoNumero,
                boxSizing: "border-box",
                marginRight: indice < NUMEROS_CARTELA.length - 1 ? 8 : 0,
                borderRadius: 10,
                border: `2px solid ${estilo.borda}`,
                backgroundColor: estilo.fundo,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: estilo.texto,
                fontSize: fonteNumero,
                fontWeight: 800,
              }}
            >
              {numero.valor}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Elemento JSX usado pelo ImageResponse. Sem Tailwind: Satori aceita só um subconjunto de CSS. */
export function elementoCard(dados: Props): ReactElement {
  return dados.config.vertical ? <CardVertical {...dados} /> : <CardHorizontal {...dados} />;
}
