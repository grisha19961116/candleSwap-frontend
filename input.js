




const ratesWrapper = document.querySelector("#ratesWrapper")

const handleRatesWrapper = (e) => {
    const arrowDown = document.getElementById('arrowDown')
    const ratesLeftSide = document.getElementById('ratesLeftSide')
    const overlayForm = document.getElementById('overlayForm')
    const overlayFormBtn = document.getElementById('overlayFormBtn')
    const ratesLeftSideInput = document.getElementById('ratesLeftSideInput')
    const ratesRightSide =  document.getElementById('ratesRightSide')
    const dataset = e.target.dataset.left

  if(dataset ===  'ratesLeftSide' && !arrowDown.classList.contains('ratesLeftSide__btn-svg--active')){
    arrowDown.classList.add('ratesLeftSide__btn-svg--active')
    ratesLeftSide.classList.add('ratesLeftSide--active')
    overlayForm.classList.add('overlayForm')
    overlayFormBtn.classList.remove('overlayFormBtn')
    overlayFormBtn.classList.add('overlayFormBtn--disable')
    ratesRightSide.classList.remove('ratesRightSide--active')
     return
  }


  arrowDown.classList.remove('ratesLeftSide__btn-svg--active')
  ratesLeftSide.classList.remove('ratesLeftSide--active')
  overlayForm.classList.remove('overlayForm')

  if(dataset === 'ratesRightSide') {
    ratesRightSide.classList.toggle('ratesRightSide--active')
    overlayFormBtn.classList.toggle('overlayFormBtn')
    overlayFormBtn.classList.toggle('overlayFormBtn--disable')
    overlayFormBtn.classList.contains('overlayFormBtn')?
    ratesLeftSideInput.value = '0x6d98ac849df87ce5cb1b15cc25df6199b252be65':
    ratesLeftSideInput.value = ''
  return
}

} 

ratesWrapper.addEventListener('click',handleRatesWrapper)

