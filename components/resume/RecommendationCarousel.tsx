import { Recommendation } from '@/components/cards';
import { pages, recommendationHighlights, recommendations } from '@/lib/content';
import { Carousel } from './Carousel';
import layout from './layout.module.css';

/**
 * Every recommendation in full, in order, server-rendered as slides; the excerpt from
 * recommendation-highlights.json is marked when it's verbatim. Carousel adds behaviour.
 */
export function RecommendationCarousel() {
  return (
    <Carousel
      labelledBy="recommendations"
      heading={
        <h2 id="recommendations" className={layout.h2}>
          Recommendations
        </h2>
      }
      slides={recommendations.map((r) => ({ id: r.id, name: r.name }))}
      interval={pages.carouselIntervalMs}
    >
      {recommendations.map((r, i) => (
        <Recommendation
          key={r.id}
          id={r.id}
          recommendation={r}
          excerpt={recommendationHighlights[r.id]}
          highlight
          role="group"
          aria-roledescription="slide"
          aria-label={`${i + 1} of ${recommendations.length}: ${r.name}`}
        />
      ))}
    </Carousel>
  );
}
