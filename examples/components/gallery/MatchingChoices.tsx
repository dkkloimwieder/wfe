import { ChoiceControls } from '../ChoiceControls'
import { MatchingCombobox } from '../../shared/controls/MatchingCombobox'
import type { GalleryState } from './catalog'

export function MatchingChoices(props: { state?: GalleryState }) {
  return (
    <section class="example-stack">
      <ChoiceControls embedded localMatching />
      <MatchingCombobox mode="startsWith" state={props.state} />
      <MatchingCombobox mode="fuzzy" state={props.state} />
    </section>
  )
}
