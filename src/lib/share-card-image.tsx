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
  verdeClaro: "#EAFCF3",
  verdeTexto: "#D0F7E5",
  accent: "#3EDA94",
  linha: "#7C8791",
  borda: "#DCE1E6",
};

// Reprodução da cartela ilustrativa da home: 12 números em duas linhas de seis.
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
      <CartelaComoFundo config={config} />
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
          <RodapeValor precoCents={precoCents} data={data} vertical={false} />
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

      <CartelaComoFundo config={config} />

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
        <RodapeValor precoCents={precoCents} data={data} vertical />
        <div style={{ color: COR.laranja, fontSize: 25, fontWeight: 800, marginTop: 14 }}>
          {config.rotulo}
        </div>
      </div>
    </div>
  );
}

/** Rodapé com o valor à esquerda e a data do sorteio em destaque à direita. */
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
            flexDirection: "column",
            alignItems: "flex-end",
            backgroundColor: COR.verde,
            border: `4px solid ${COR.superficie}`,
            borderRadius: 999,
            padding: vertical ? "14px 32px" : "10px 24px",
          }}
        >
          <div
            style={{
              color: COR.verdeTexto,
              fontSize: vertical ? 18 : 14,
              fontWeight: 800,
              letterSpacing: 2,
            }}
          >
            SORTEIO
          </div>
          <div
            style={{
              color: COR.superficie,
              fontSize: vertical ? 34 : 24,
              fontWeight: 800,
              marginTop: 2,
            }}
          >
            {data}
          </div>
        </div>
      )}
    </div>
  );
}

/** Reprodução exata da cartela da home, aplicada como fundo na área rosa do card. */
function CartelaComoFundo({ config }: { config: ConfigCard }) {
  const { largura, top, opacidade } = config.fundoCartela;
  const fator = largura / 448;
  const px = (valor: number) => valor * fator;
  const esquerda = config.vertical
    ? (config.largura - largura) / 2
    : 440 + (config.largura - 452 - largura) / 2;
  const larguraNumero = (400 - 3 * 10) / 4;

  const linhas: (typeof NUMEROS_CARTELA)[number][][] = [];
  for (let i = 0; i < NUMEROS_CARTELA.length; i += 4) {
    linhas.push(NUMEROS_CARTELA.slice(i, i + 4));
  }

  return (
    <div
      style={{
        display: "flex",
        position: "absolute",
        top,
        left: esquerda,
        width: largura,
        opacity: opacidade,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          boxSizing: "border-box",
          backgroundColor: COR.superficie,
          border: `${px(1)}px solid ${COR.borda}`,
          borderRadius: px(24),
          padding: px(24),
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ color: COR.laranja, fontSize: px(14), fontWeight: 800, letterSpacing: px(2) }}>
              Rifa da esperança
            </div>
            <div style={{ color: COR.titulo, fontSize: px(20), fontWeight: 800, marginTop: px(6) }}>
              Bazar da escola
            </div>
          </div>
          <div
            style={{
              display: "flex",
              backgroundColor: COR.verde,
              borderRadius: 999,
              padding: `${px(6)}px ${px(10)}px`,
              color: COR.superficie,
              fontSize: px(12),
              fontWeight: 800,
            }}
          >
            Aberta
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: px(112),
            marginTop: px(20),
            borderRadius: px(16),
            backgroundColor: COR.laranjaVivo,
            backgroundImage: `linear-gradient(135deg, ${COR.laranjaVivo}, ${COR.accent})`,
          }}
        >
          <svg width={px(42)} height={px(42)} viewBox="0 0 24 24" fill="none">
            <path
              d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
              fill={COR.superficie}
            />
          </svg>
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: px(20) }}>
          <div
            style={{
              display: "flex",
              width: "100%",
              justifyContent: "space-between",
              color: COR.texto,
              fontSize: px(14),
              fontWeight: 700,
            }}
          >
            <div>128 de 300 números</div>
            <div style={{ color: COR.laranja }}>43% vendidos</div>
          </div>
          <div
            style={{
              display: "flex",
              width: "100%",
              height: px(8),
              marginTop: px(8),
              borderRadius: 999,
              backgroundColor: COR.superficieMuda,
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", width: "43%", height: "100%", backgroundColor: COR.laranjaVivo }} />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: px(20) }}>
          {linhas.map((linha, indiceLinha) => (
            <div
              key={indiceLinha}
              style={{ display: "flex", marginBottom: indiceLinha < linhas.length - 1 ? px(10) : 0 }}
            >
              {linha.map((numero, indiceNumero) => {
                const estilo = ESTILOS_NUMERO[numero.estado];
                return (
                  <div
                    key={numero.valor}
                    style={{
                      width: px(larguraNumero),
                      height: px(44),
                      boxSizing: "border-box",
                      marginRight: indiceNumero < linha.length - 1 ? px(10) : 0,
                      borderRadius: px(12),
                      border: `${px(1)}px solid ${estilo.borda}`,
                      backgroundColor: estilo.fundo,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: estilo.texto,
                      fontSize: px(16),
                      fontWeight: 800,
                    }}
                  >
                    {numero.valor}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            width: "100%",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: px(20),
            paddingTop: px(16),
            borderTop: `${px(1)}px solid ${COR.borda}`,
          }}
        >
          <div style={{ color: COR.texto, fontSize: px(16) }}>Cada número</div>
          <div style={{ color: COR.titulo, fontSize: px(18), fontWeight: 800 }}>R$ 20,00</div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          position: "absolute",
          bottom: -px(24),
          left: -px(12),
          alignItems: "center",
          backgroundColor: COR.superficie,
          border: `${px(1)}px solid ${COR.borda}`,
          borderRadius: px(16),
          padding: `${px(12)}px ${px(16)}px`,
        }}
      >
        <div
          style={{
            display: "flex",
            width: px(40),
            height: px(40),
            marginRight: px(12),
            borderRadius: 999,
            backgroundColor: COR.verdeClaro,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width={px(22)}
            height={px(22)}
            viewBox="0 0 24 24"
            fill="none"
            stroke={COR.verde}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <path d="m9 11 3 3L22 4" />
          </svg>
        </div>
        <div style={{ color: COR.titulo, fontSize: px(16), fontWeight: 800 }}>
          Pagamento confirmado!
        </div>
      </div>
    </div>
  );
}

/** Elemento JSX usado pelo ImageResponse. Sem Tailwind: Satori aceita só um subconjunto de CSS. */
export function elementoCard(dados: Props): ReactElement {
  return dados.config.vertical ? <CardVertical {...dados} /> : <CardHorizontal {...dados} />;
}
