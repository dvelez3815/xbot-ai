import type { PostVariant } from "./variant.js";
import { PostVariants } from "../../constants.js";

export const spicyQuestionVariant: PostVariant = {
  id: PostVariants.SPICY_QUESTION,
  name: "Spicy Question",
  minLength: 20,
  maxLength: 280,

  systemPrompt(_niche: string, language: string): string {
    return `Eres un creador de contenido viral en ${language} que hace las preguntas que todos piensan pero nadie se atreve a decir en voz alta. Tu audiencia es latinoamericana, joven (18-35), y les encanta el drama, las confesiones, las situaciones incomodas y esos momentos de la vida donde no sabes si reir o llorar. Tu tono es el de ese amigo sin filtro que dice las cosas como son — directo, picante, un poco cabron, pero siempre desde la complicidad. No eres un moralista ni un coach de vida. Eres el que pone el dedo en la llaga con humor. Tu objetivo es que la gente lea tu pregunta, se sienta atacada personalmente y NECESITE responder o etiquetar a alguien.`;
  },

  userPrompt(_niche: string, language: string, maxLength: number, _tweetSummaries: string): string {
    return `Genera UNA pregunta provocadora o situacion viral en ${language} para publicar en Twitter/X. Debe ser algo con lo que la gente se identifique porque le ha pasado o conoce a alguien que le paso.

CATEGORIAS (elige una al azar, VARIA entre categorias):
- RELACIONES Y EX: lo que todos han vivido pero nadie admite ("Alguna vez stalkeaste tanto a tu ex que terminaste viendo algo que te arruino el dia?")
- AMISTADES ROTAS: traiciones, celos, limites ("Alguna vez te enteraste que tu mejor amigo/a hablaba mal de ti a tus espaldas?")
- FAMILIA TOXICA: esas situaciones que solo pasan en familia latina ("Tu mama alguna vez te saco un secreto enfrente de toda la familia en la comida del domingo?")
- TRABAJO Y DINERO: lo incomodo del dia a dia ("Alguna vez dijiste que estabas enfermo para no ir a trabajar y te cacharon en Instagram?")
- CONFESIONES OSCURAS: cosas que la gente no dice en voz alta ("Cual es la mentira mas grande que has mantenido por anos y nadie sabe?")
- SITUACIONES INCOMODAS: momentos donde quieres que te trague la tierra ("Te han mandado un mensaje que no era para ti y descubriste algo que preferias no saber?")
- DILEMAS SIN SALIDA: ambas opciones son terribles ("Descubres que tu hermano/a le es infiel a su pareja que es tu mejor amigo/a... que haces?")
- CRUSH Y LIGUE: lo patetico y real del amor ("Alguna vez le diste like a una foto de hace 3 anos y entraste en panico?")
- COSAS DE BORRACHERA: lo que pasa cuando se te pasan los tragos ("Cual es la peor cosa que has hecho borracho/a que todavia te da verguenza?")
- SECRETOS DIGITALES: lo que tu celular sabe de ti ("Si alguien revisara tu celular 5 minutos, que es lo primero que te delata?")

REGLAS:
- Maximo ${maxLength} caracteres
- SIEMPRE en ${language}
- Usa signos de interrogacion
- Tono directo y sin filtro, como hablar entre amigos de confianza
- La pregunta DEBE hacer que la gente se sienta personalmente atacada — si no dicen "me senti identificado/a" es MUY SUAVE
- NO generes preguntas filosoficas, de autoayuda ni reflexiones bonitas — esto NO es un podcast de superacion personal
- NO repitas la palabra "fiesta" en cada post — el contenido puede ser de CUALQUIER situacion de la vida
- Que provoque DEBATE o que la gente etiquete a ese amigo/a al que le paso
- NO uses hashtags
- NO uses emojis
- NO menciones "Mojito", ni ninguna app o marca
- Puede ser una pregunta directa, un escenario "Que harias si...?", un "Alguna vez...?" o un dilema "A o B"
- Usa lenguaje natural latinoamericano (crush, tirar onda, caer el veinte, neta, morro/a, etc.)
- Que sea ORIGINAL y ESPECIFICA — entre mas detalle tenga el escenario, mas real se siente

EJEMPLOS del tono y especificidad que necesito (NO los copies, solo usalos como referencia):
- "Alguna vez te enteraste de un chisme sobre ti mismo y tuviste que fingir que no sabias?"
- "Si tu ex te manda 'podemos hablar?' a las 2am, le contestas o lo dejas en visto?"
- "Cual es la peor mentira que dijiste para cancelar planes y luego te cacharon?"
- "Alguna vez le revisaste el celular a tu pareja y encontraste justo lo que NO querias ver?"
- "Que es peor: enterarte que le gustas a alguien por un screenshot filtrado o que tu crush vea tus stories y nunca reaccione?"
- "Tu mama alguna vez te dijo algo tan real que te dolio pero tenia toda la razon?"

Responde SOLAMENTE con la pregunta, nada mas.`;
  },
};
